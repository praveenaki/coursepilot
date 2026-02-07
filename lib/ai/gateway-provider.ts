import type { AIProvider, AIStreamOptions } from '@/lib/types';
import { parseSSEStream } from '@/utils/streaming';

/**
 * Local gateway provider — connects to any OpenAI-compatible endpoint.
 * Works with: Ollama, LM Studio, vLLM, clawdbot, or any local AI gateway.
 */
export class GatewayProvider implements AIProvider {
  readonly type = 'gateway' as const;

  constructor(
    private baseUrl: string = 'http://127.0.0.1:18789',
    private apiKey: string = '',
    private model: string = 'default',
  ) {}

  async *stream(options: AIStreamOptions): AsyncGenerator<string, void, unknown> {
    const messages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const url = `${this.baseUrl}/v1/chat/completions`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        stream: true,
        messages,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gateway API error (${response.status}): ${error}`);
    }

    const reader = response.body!.getReader();

    for await (const event of parseSSEStream(reader, options.signal)) {
      try {
        const data = JSON.parse(event.data);
        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // Skip malformed events
      }
    }
  }

  async validate(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/v1/chat/completions`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
