import { storage } from '#imports';
import type {
  AIProviderType,
  ChatSession,
  CourseInfo,
  CourseProgress,
  PageContext,
  QuizSession,
  Settings,
} from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';

// ─── Synced Storage (across devices) ──────────────────────

export const settingsStorage = storage.defineItem<Settings>('sync:settings', {
  defaultValue: DEFAULT_SETTINGS,
});

// ─── Local Storage (device-specific) ──────────────────────

// API keys — never synced across devices
export const apiKeysStorage = storage.defineItem<Record<AIProviderType, string>>(
  'local:apiKeys',
  {
    defaultValue: {
      anthropic: '',
      openai: '',
      gemini: '',
      gateway: '',
    },
  },
);

// Gateway base URL for local AI provider
export const gatewayUrlStorage = storage.defineItem<string>(
  'local:gatewayUrl',
  { defaultValue: 'http://127.0.0.1:18789' },
);

// Detected course structures
export const coursesStorage = storage.defineItem<Record<string, CourseInfo>>(
  'local:courses',
  { defaultValue: {} },
);

// Progress per course
export const progressStorage = storage.defineItem<Record<string, CourseProgress>>(
  'local:progress',
  { defaultValue: {} },
);

// Extracted page content cache (progressive accumulation)
export const contextCacheStorage = storage.defineItem<Record<string, PageContext>>(
  'local:contextCache',
  { defaultValue: {} },
);

// Listen mode chat history per page
export const chatHistoryStorage = storage.defineItem<Record<string, ChatSession>>(
  'local:chatHistory',
  { defaultValue: {} },
);

// Quiz session history
export const quizHistoryStorage = storage.defineItem<QuizSession[]>(
  'local:quizHistory',
  { defaultValue: [] },
);

// Pending explanation request (set by content script, consumed by side panel)
export const pendingExplanationStorage = storage.defineItem<{
  text: string;
  pageUrl: string;
  timestamp: number;
} | null>('local:pendingExplanation', { defaultValue: null });
