// ─── AI Provider Types ────────────────────────────────────

export type AIProviderType = 'anthropic' | 'openai' | 'gemini' | 'gateway';

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  model: string;
  baseUrl?: string; // For gateway provider
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIStreamOptions {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface AIProvider {
  readonly type: AIProviderType;
  stream(options: AIStreamOptions): AsyncGenerator<string, void, unknown>;
  validate(): Promise<boolean>;
}

// ─── Course Types ─────────────────────────────────────────

export interface CourseInfo {
  id: string;
  title: string;
  baseUrl: string;
  platform: CoursePlatform;
  pages: CoursePage[];
  llmsTxt?: string; // Raw llms.txt content if found
  detectedAt: number;
}

export type CoursePlatform = 'docsify' | 'gitbook' | 'readthedocs' | 'generic';

export interface CoursePage {
  url: string;
  title: string;
  path: string; // Relative path within course
  order: number;
  parentModule?: string;
}

// ─── Quiz Types ───────────────────────────────────────────

export type BloomLevel =
  | 'remember'
  | 'understand'
  | 'apply'
  | 'analyze'
  | 'evaluate'
  | 'create';

export type QuestionType =
  | 'mcq'
  | 'true-false'
  | 'fill-blank'
  | 'free-response';

export interface QuizQuestion {
  id: string;
  text: string;
  type: QuestionType;
  bloomLevel: BloomLevel;
  options?: string[]; // For MCQ
  correctAnswer?: string; // For MCQ/true-false/fill-blank
  hints: string[]; // Progressive hints (3 levels)
  sourceSection?: string; // Which part of the page this tests
}

export interface QuizAttempt {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  hintsUsed: number;
  score: number; // 0-100 after hint penalty
  feedback: string;
  timestamp: number;
}

export interface QuizSession {
  id: string;
  courseId: string;
  pageUrl: string;
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  masteryScore: number; // Weighted by Bloom's levels
  passed: boolean;
  startedAt: number;
  completedAt?: number;
}

// ─── Progress Types ───────────────────────────────────────

export interface PageProgress {
  url: string;
  courseId: string;
  masteryScore: number;
  quizSessions: string[]; // QuizSession IDs
  scrollProgress: number; // 0-1
  visitCount: number;
  lastVisited: number;
  mastered: boolean;
}

export interface CourseProgress {
  courseId: string;
  pageProgress: Record<string, PageProgress>; // keyed by URL
  overallMastery: number; // Average of all page mastery scores
  pagesCompleted: number;
  totalPages: number;
  startedAt: number;
  lastActiveAt: number;
}

// ─── Chat / Listen Mode Types ─────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  contextScrollPosition?: number; // How far user had scrolled when asking
}

export interface ChatSession {
  id: string;
  courseId: string;
  pageUrl: string;
  messages: ChatMessage[];
  startedAt: number;
  lastMessageAt: number;
}

// ─── Settings Types ───────────────────────────────────────

export interface Settings {
  activeProvider: AIProviderType;
  masteryThreshold: number; // 0-100, default 80
  autoNavigate: boolean;
  questionsPerQuiz: number; // default 5
  theme: 'light' | 'dark' | 'system';
  showFAB: boolean;
  showSelectionPopup: boolean;
  keyboardShortcutsEnabled: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  activeProvider: 'anthropic',
  masteryThreshold: 80,
  autoNavigate: false,
  questionsPerQuiz: 5,
  theme: 'system',
  showFAB: true,
  showSelectionPopup: true,
  keyboardShortcutsEnabled: true,
};

// ─── Context Types ────────────────────────────────────────

export interface PageContext {
  url: string;
  title: string;
  content: string; // Clean extracted text
  extractedAt: number;
  tokenEstimate: number;
}

export interface ContextBudget {
  systemPrompt: number;
  llmsTxt: number;
  currentPage: number;
  adjacentPages: number;
  visitedPages: number;
  chatHistory: number;
  reserve: number;
  total: number;
}

export const DEFAULT_CONTEXT_BUDGET: ContextBudget = {
  systemPrompt: 2000,
  llmsTxt: 20000,
  currentPage: 10000,
  adjacentPages: 10000,
  visitedPages: 40000,
  chatHistory: 10000,
  reserve: 8000,
  total: 100000,
};
