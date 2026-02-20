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
import type { ExportStatus, FoxitCredentials } from '@/lib/foxit/types';
import { DEFAULT_FOXIT_CREDENTIALS } from '@/lib/foxit/types';

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

// ─── You.com Web Research ──────────────────────────────

// You.com API key (separate from AI providers — this is a research enhancement)
export const youcomApiKeyStorage = storage.defineItem<string>(
  'local:youcomApiKey',
  { defaultValue: '' },
);

// Pending research request (set by content script "Research" button, consumed by Research tab)
export const pendingResearchStorage = storage.defineItem<{
  text: string;
  pageUrl: string;
  timestamp: number;
} | null>('local:pendingResearch', { defaultValue: null });

// ─── Foxit PDF Export ────────────────────────────────────

// Foxit API credentials (Doc Gen + PDF Services, separate keys)
export const foxitCredentialsStorage = storage.defineItem<FoxitCredentials>(
  'local:foxitCredentials',
  { defaultValue: DEFAULT_FOXIT_CREDENTIALS },
);

// Export pipeline status (watched by ExportButton for progress)
export const exportStatusStorage = storage.defineItem<ExportStatus>(
  'local:exportStatus',
  { defaultValue: { step: 'idle' } },
);
