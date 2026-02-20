import type { BloomLevel } from '@/lib/types';
import {
  progressStorage,
  coursesStorage,
  quizHistoryStorage,
  settingsStorage,
  chatHistoryStorage,
  contextCacheStorage,
} from '@/utils/storage';
import type { CertificateData, StudyReportData } from './types';

const BLOOM_LEVELS: BloomLevel[] = [
  'remember',
  'understand',
  'apply',
  'analyze',
  'evaluate',
  'create',
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Resolves the course name with a fallback chain:
 * 1. coursesStorage title
 * 2. contextCacheStorage page titles (extract from separator patterns)
 * 3. URL hostname
 */
async function resolveCourseName(
  courseId: string,
  courses: Record<string, import('@/lib/types').CourseInfo>,
  pageUrls: string[],
): Promise<string> {
  // 1. From detected/saved course
  if (courses[courseId]?.title && courses[courseId].title !== courseId) {
    return courses[courseId].title;
  }

  // 2. From context cache — check page titles
  const contextCache = await contextCacheStorage.getValue();
  for (const url of pageUrls) {
    const cached = contextCache[url];
    if (cached?.title) {
      // Try to extract course name from "Page - Course" pattern
      const separators = [' - ', ' | ', ' — ', ' · '];
      for (const sep of separators) {
        if (cached.title.includes(sep)) {
          return cached.title.split(sep).pop()!.trim();
        }
      }
      // Use the full title (likely the course/page name from document.title)
      return cached.title;
    }
  }

  // 3. From URL hostname
  if (pageUrls.length > 0) {
    try {
      const url = new URL(pageUrls[0]);
      return url.hostname === 'localhost' ? `Course on ${url.host}` : url.hostname;
    } catch { /* fall through */ }
  }

  return courseId;
}

// ─── Certificate Data ────────────────────────────────────

export async function aggregateCertificateData(
  courseId: string,
): Promise<CertificateData> {
  const [allProgress, courses, quizHistory, settings] = await Promise.all([
    progressStorage.getValue(),
    coursesStorage.getValue(),
    quizHistoryStorage.getValue(),
    settingsStorage.getValue(),
  ]);

  const courseProgress = allProgress[courseId];
  const course = courses[courseId];
  const courseQuizzes = quizHistory.filter((q) => q.courseId === courseId);

  // Determine which Bloom's levels were tested
  const testedLevels = new Set<BloomLevel>();
  for (const quiz of courseQuizzes) {
    for (const question of quiz.questions) {
      testedLevels.add(question.bloomLevel);
    }
  }
  const sortedLevels = BLOOM_LEVELS.filter((l) => testedLevels.has(l));

  const pages = courseProgress
    ? Object.values(courseProgress.pageProgress)
    : [];

  const pageUrls = pages.map((p) => p.url);
  const courseName = await resolveCourseName(courseId, courses, pageUrls);

  return {
    courseName,
    overallMastery: `${courseProgress?.overallMastery ?? 0}%`,
    completionDate: formatDate(new Date()),
    bloomLevelsAchieved:
      sortedLevels.map(capitalize).join(', ') || 'None yet',
    totalPagesStudied: String(pages.length),
    totalQuizzesTaken: String(courseQuizzes.length),
    masteryThreshold: `${settings.masteryThreshold}%`,
  };
}

// ─── Study Report Data ───────────────────────────────────

export async function aggregateStudyReportData(
  courseId: string,
): Promise<StudyReportData> {
  const [allProgress, courses, quizHistory, chatHistory, contextCache, settings] =
    await Promise.all([
      progressStorage.getValue(),
      coursesStorage.getValue(),
      quizHistoryStorage.getValue(),
      chatHistoryStorage.getValue(),
      contextCacheStorage.getValue(),
      settingsStorage.getValue(),
    ]);

  const courseProgress = allProgress[courseId];
  const course = courses[courseId];
  const courseQuizzes = quizHistory.filter((q) => q.courseId === courseId);

  const pages = courseProgress
    ? Object.values(courseProgress.pageProgress)
    : [];
  const mastered = pages.filter((p) => p.mastered);

  // ── Page Progress ──────────────────────────────────────
  const pageRows = pages.map((page) => {
    // Resolve title from context cache, fallback to URL path
    const cached = contextCache[page.url];
    let title = cached?.title ?? '';
    if (!title) {
      try {
        title = new URL(page.url).pathname;
      } catch {
        title = page.url;
      }
    }

    let status: string;
    if (page.mastered) status = 'Mastered';
    else if (page.masteryScore > 0) status = 'In Progress';
    else status = 'Not Started';

    return {
      pageTitle: title,
      masteryScore: `${page.masteryScore}%`,
      status,
    };
  });

  // ── Bloom's Performance ────────────────────────────────
  // Build a map: bloomLevel → { attempted, correct }
  const bloomStats: Record<string, { attempted: number; correct: number }> = {};
  for (const level of BLOOM_LEVELS) {
    bloomStats[level] = { attempted: 0, correct: 0 };
  }

  // Cross-reference: QuizAttempt.questionId → QuizQuestion.bloomLevel
  for (const quiz of courseQuizzes) {
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    for (const attempt of quiz.attempts) {
      const question = questionMap.get(attempt.questionId);
      if (question) {
        bloomStats[question.bloomLevel].attempted++;
        if (attempt.isCorrect) {
          bloomStats[question.bloomLevel].correct++;
        }
      }
    }
  }

  const bloomRows = BLOOM_LEVELS.filter(
    (level) => bloomStats[level].attempted > 0,
  ).map((level) => {
    const stats = bloomStats[level];
    const rate =
      stats.attempted > 0
        ? Math.round((stats.correct / stats.attempted) * 100)
        : 0;
    return {
      level: capitalize(level),
      questionsAttempted: String(stats.attempted),
      correctRate: `${rate}%`,
    };
  });

  // ── Missed Questions ───────────────────────────────────
  // Collect incorrect attempts with question text, limit to 20
  const missed: StudyReportData['missedQuestions'] = [];
  for (const quiz of courseQuizzes) {
    if (missed.length >= 20) break;
    const questionMap = new Map(quiz.questions.map((q) => [q.id, q]));
    for (const attempt of quiz.attempts) {
      if (missed.length >= 20) break;
      if (!attempt.isCorrect) {
        const question = questionMap.get(attempt.questionId);
        if (question) {
          missed.push({
            question: question.text,
            bloomLevel: capitalize(question.bloomLevel),
            correctAnswer: question.correctAnswer ?? 'See course material',
          });
        }
      }
    }
  }

  // ── Chat Topics ────────────────────────────────────────
  // First user message per ChatSession as the topic
  const chatTopics: StudyReportData['chatTopics'] = [];
  for (const session of Object.values(chatHistory)) {
    if (session.courseId !== courseId) continue;
    const firstUserMsg = session.messages.find((m) => m.role === 'user');
    if (firstUserMsg) {
      const topic =
        firstUserMsg.content.length > 80
          ? firstUserMsg.content.slice(0, 77) + '...'
          : firstUserMsg.content;
      chatTopics.push({
        topic,
        messageCount: String(session.messages.length),
      });
    }
  }

  const reportPageUrls = pages.map((p) => p.url);
  const reportCourseName = await resolveCourseName(courseId, courses, reportPageUrls);

  return {
    courseName: reportCourseName,
    overallMastery: `${courseProgress?.overallMastery ?? 0}%`,
    totalPages: String(pages.length),
    pagesMastered: String(mastered.length),
    completionDate: formatDate(new Date()),
    pages: pageRows,
    bloomPerformance: bloomRows,
    missedQuestions: missed,
    chatTopics,
  };
}
