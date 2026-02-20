import { useState, useEffect } from 'react';
import { sendToBackground } from '@/lib/messaging';
import type { CourseProgress, PageProgress } from '@/lib/types';
import { progressStorage, quizHistoryStorage, coursesStorage } from '@/utils/storage';
import ExportButton from '../components/ExportButton';

export default function ProgressView() {
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, []);

  async function loadProgress() {
    try {
      // First try progressStorage directly
      const allProgress = await progressStorage.getValue();
      let courses = Object.values(allProgress);

      // If progressStorage is empty, build progress from quiz history
      if (courses.length === 0) {
        const built = await buildProgressFromQuizHistory();
        if (built) {
          courses = [built];
        }
      }

      if (courses.length === 0) {
        setLoading(false);
        return;
      }

      // Try to match current tab URL to a course
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const tabUrl = tab?.url ?? '';

      const matched = courses.find((cp) =>
        Object.keys(cp.pageProgress).some((pageUrl) => {
          try { return tabUrl.startsWith(new URL(pageUrl).origin); } catch { return false; }
        }),
      );

      setProgress(matched ?? courses[0]);
      setLoading(false);
    } catch (err) {
      console.error('[CoursePilot] loadProgress error:', err);
      setLoading(false);
    }
  }

  // Build CourseProgress from quizHistoryStorage when progressStorage is empty
  async function buildProgressFromQuizHistory(): Promise<CourseProgress | null> {
    const [quizzes, allCourses, settings] = await Promise.all([
      quizHistoryStorage.getValue(),
      coursesStorage.getValue(),
      sendToBackground({ type: 'GET_SETTINGS' }) as Promise<{ masteryThreshold?: number }>,
    ]);

    if (quizzes.length === 0) return null;

    const threshold = settings?.masteryThreshold ?? 80;

    // Group quizzes by courseId
    const byCourse: Record<string, typeof quizzes> = {};
    for (const q of quizzes) {
      const cid = q.courseId || 'unknown';
      (byCourse[cid] ??= []).push(q);
    }

    // Build progress for the first course that has quizzes
    const [courseId, courseQuizzes] = Object.entries(byCourse)[0];

    // Group quizzes by pageUrl
    const byPage: Record<string, typeof quizzes> = {};
    for (const q of courseQuizzes) {
      (byPage[q.pageUrl] ??= []).push(q);
    }

    const pageProgress: Record<string, PageProgress> = {};
    for (const [url, pageQuizzes] of Object.entries(byPage)) {
      const bestScore = Math.max(...pageQuizzes.map((q) => q.masteryScore));
      pageProgress[url] = {
        url,
        courseId,
        masteryScore: bestScore,
        quizSessions: pageQuizzes.map((q) => q.id),
        scrollProgress: 0,
        visitCount: pageQuizzes.length,
        lastVisited: Math.max(...pageQuizzes.map((q) => q.completedAt ?? q.startedAt)),
        mastered: bestScore >= threshold,
      };
    }

    const pages = Object.values(pageProgress);
    const overall = pages.length > 0
      ? Math.round(pages.reduce((sum, p) => sum + p.masteryScore, 0) / pages.length)
      : 0;

    const built: CourseProgress = {
      courseId,
      pageProgress,
      overallMastery: overall,
      pagesCompleted: pages.filter((p) => p.mastered).length,
      totalPages: allCourses[courseId]?.pages?.length || pages.length,
      startedAt: Math.min(...courseQuizzes.map((q) => q.startedAt)),
      lastActiveAt: Math.max(...courseQuizzes.map((q) => q.completedAt ?? q.startedAt)),
    };

    // Persist so we don't rebuild every time
    const allProgress = await progressStorage.getValue();
    allProgress[courseId] = built;
    await progressStorage.setValue(allProgress);

    return built;
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-cp-text-muted)' }}>Loading progress...</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <h2 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: 600 }}>
          No Progress Yet
        </h2>
        <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
          Navigate to a course and take some quizzes to start tracking your mastery.
        </p>
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--color-cp-surface)',
          borderRadius: '8px',
          textAlign: 'left',
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>How it works</h3>
          <ul style={{
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '13px',
            color: 'var(--color-cp-text-muted)',
          }}>
            <li>📖 Read a course page</li>
            <li>🎯 Take a quiz when prompted</li>
            <li>💡 Use hints if stuck (costs points)</li>
            <li>✅ Score 80%+ to master the page</li>
            <li>🚀 Move to the next topic</li>
          </ul>
        </div>
      </div>
    );
  }

  const pages = Object.values(progress.pageProgress);
  const mastered = pages.filter((p) => p.mastered);

  return (
    <div style={{ padding: '16px' }}>
      {/* Overall Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <StatCard label="Overall Mastery" value={`${progress.overallMastery}%`} color="var(--color-cp-primary)" />
        <StatCard label="Pages Mastered" value={`${mastered.length}/${pages.length}`} color="var(--color-cp-success)" />
      </div>

      {/* Page List */}
      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Pages</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {pages.map((page) => (
          <PageProgressCard key={page.url} page={page} />
        ))}
      </div>

      {/* Export Button */}
      <ExportButton courseId={progress.courseId} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{
      padding: '12px',
      background: 'var(--color-cp-surface)',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '24px', fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--color-cp-text-muted)', marginTop: '4px' }}>{label}</div>
    </div>
  );
}

function PageProgressCard({ page }: { page: PageProgress }) {
  // Docsify uses hash routing — real path is in the hash, not pathname
  const parsed = new URL(page.url);
  const urlPath = parsed.hash ? parsed.hash.replace(/^#\/?/, '/') : parsed.pathname;

  return (
    <div style={{
      padding: '10px 12px',
      background: 'var(--color-cp-surface)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '16px' }}>
        {page.mastered ? '✅' : page.masteryScore > 0 ? '🔶' : '⬜'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {urlPath}
        </div>
        <div style={{
          height: '3px',
          borderRadius: '1.5px',
          background: 'var(--color-cp-border)',
          marginTop: '4px',
        }}>
          <div style={{
            width: `${page.masteryScore}%`,
            height: '100%',
            borderRadius: '1.5px',
            background: page.mastered ? 'var(--color-cp-success)' : 'var(--color-cp-primary)',
          }} />
        </div>
      </div>
      <span style={{
        fontSize: '12px',
        fontWeight: 600,
        color: page.mastered ? 'var(--color-cp-success)' : 'var(--color-cp-text-muted)',
      }}>
        {page.masteryScore}%
      </span>
    </div>
  );
}
