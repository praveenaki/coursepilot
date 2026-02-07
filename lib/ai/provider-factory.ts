import type { AIProvider, AIProviderType } from '@/lib/types';
import { DEFAULT_MODELS } from './types';
import { AnthropicProvider } from './anthropic-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { GatewayProvider } from './gateway-provider';

interface ProviderOptions {
  type: AIProviderType;
  apiKey: string;
  model?: string;
  baseUrl?: string; // For gateway
}

export function createProvider(options: ProviderOptions): AIProvider {
  const model = options.model || DEFAULT_MODELS[options.type];

  switch (options.type) {
    case 'anthropic':
      return new AnthropicProvider(options.apiKey, model);
    case 'openai':
      return new OpenAIProvider(options.apiKey, model);
    case 'gemini':
      return new GeminiProvider(options.apiKey, model);
    case 'gateway':
      return new GatewayProvider(options.baseUrl, options.apiKey, model);
  }
}
