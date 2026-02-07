import type { AIMessage, AIProvider, AIProviderType, AIStreamOptions } from '@/lib/types';

// Re-export for convenience
export type { AIMessage, AIProvider, AIProviderType, AIStreamOptions };

// ─── Provider-specific config ─────────────────────────────

export interface AnthropicConfig {
  apiKey: string;
  model: string; // e.g. 'claude-sonnet-4-5-20250929'
}

export interface OpenAIConfig {
  apiKey: string;
  model: string; // e.g. 'gpt-4o'
}

export interface GeminiConfig {
  apiKey: string;
  model: string; // e.g. 'gemini-3-flash-preview'
}

export interface GatewayConfig {
  baseUrl: string; // e.g. 'http://127.0.0.1:18789'
  apiKey: string;
  model: string;
}

// ─── SSE Parsing Types ────────────────────────────────────

export interface SSEEvent {
  event?: string;
  data: string;
}

// ─── Default Models ───────────────────────────────────────

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  gemini: 'gemini-3-flash-preview',
  gateway: 'default',
};
