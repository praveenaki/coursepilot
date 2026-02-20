import type {
  AIProviderType,
  BloomLevel,
  ChatMessage,
  CourseInfo,
  PageProgress,
  QuizQuestion,
  QuizSession,
  ResearchResult,
  Settings,
  YouComSource,
} from './types';
import type { FoxitCredentials } from './foxit/types';

// ─── Message Protocol ─────────────────────────────────────
// Content Script ↔ Background ↔ Side Panel
//
// All communication flows through the background worker.
// Content scripts and side panels never talk directly.

// Messages FROM content script TO background
export type ContentToBackgroundMessage =
  | { type: 'PAGE_CONTENT_EXTRACTED'; payload: { url: string; title: string; content: string } }
  | { type: 'COURSE_DETECTED'; payload: CourseInfo }
  | { type: 'SCROLL_PROGRESS'; payload: { url: string; progress: number } }
  | { type: 'TEXT_SELECTED'; payload: { text: string; url: string } }
  | { type: 'QUIZ_REQUESTED'; payload: { url: string } }
  | { type: 'NAVIGATE_NEXT'; payload: { currentUrl: string } };

// Messages FROM side panel TO background
export type PanelToBackgroundMessage =
  | { type: 'GENERATE_QUIZ'; payload: { url: string; bloomLevels?: BloomLevel[] } }
  | { type: 'EVALUATE_ANSWER'; payload: { question: QuizQuestion; answer: string; pageContent: string } }
  | { type: 'EXPLAIN_TEXT'; payload: { text: string; pageUrl: string } }
  | { type: 'CHAT_MESSAGE'; payload: { message: string; pageUrl: string; scrollProgress: number } }
  | { type: 'GET_PAGE_PROGRESS'; payload: { url: string } }
  | { type: 'GET_COURSE_PROGRESS'; payload: { courseId: string } }
  | { type: 'GET_SETTINGS' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'SET_API_KEY'; payload: { provider: AIProviderType; key: string } }
  | { type: 'VALIDATE_PROVIDER'; payload: { provider: AIProviderType } }
  | { type: 'EXPORT_PORTFOLIO'; payload: { courseId: string } }
  | { type: 'SET_FOXIT_CREDENTIALS'; payload: FoxitCredentials }
  | { type: 'VALIDATE_FOXIT' }
  | { type: 'RESEARCH_TOPIC'; payload: { topic: string; pageUrl?: string } }
  | { type: 'SEARCH_WEB'; payload: { query: string } }
  | { type: 'GET_NEWS'; payload: { query: string } }
  | { type: 'SET_YOUCOM_KEY'; payload: { key: string } }
  | { type: 'VALIDATE_YOUCOM' };

// Messages FROM background TO content script
export type BackgroundToContentMessage =
  | { type: 'SHOW_FAB'; payload: { show: boolean } }
  | { type: 'NAVIGATE_TO'; payload: { url: string } }
  | { type: 'PAGE_MASTERED'; payload: { url: string; score: number } };

// Messages FROM background TO side panel
export type BackgroundToPanelMessage =
  | { type: 'QUIZ_GENERATED'; payload: QuizSession }
  | { type: 'ANSWER_EVALUATED'; payload: { questionId: string; isCorrect: boolean; score: number; feedback: string } }
  | { type: 'PAGE_PROGRESS_UPDATE'; payload: PageProgress }
  | { type: 'SETTINGS_UPDATE'; payload: Settings }
  | { type: 'PROVIDER_VALIDATED'; payload: { provider: AIProviderType; valid: boolean; error?: string } }
  | { type: 'ERROR'; payload: { message: string; code?: string } };

// Union of all messages for the background router
export type IncomingMessage = ContentToBackgroundMessage | PanelToBackgroundMessage;

// ─── Port-based streaming messages ────────────────────────
// Used for long-lived connections (AI streaming responses)

export type StreamPortMessage =
  | { type: 'STREAM_START'; requestId: string }
  | { type: 'STREAM_CHUNK'; requestId: string; chunk: string }
  | { type: 'STREAM_END'; requestId: string }
  | { type: 'STREAM_ERROR'; requestId: string; error: string };

// Port names
export const PORT_NAMES = {
  AI_STREAM: 'coursepilot-ai-stream',
} as const;

// ─── Helpers ──────────────────────────────────────────────

export function sendToBackground(message: IncomingMessage): Promise<unknown> {
  return browser.runtime.sendMessage(message);
}

export function sendToTab(tabId: number, message: BackgroundToContentMessage): Promise<void> {
  return browser.tabs.sendMessage(tabId, message);
}
