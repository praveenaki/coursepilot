import type { AIProvider, AIStreamOptions } from '@/lib/types';
import { parseSSEStream } from '@/utils/streaming';

export class AnthropicProvider implements AIProvider {
  readonly type = 'anthropic' as const;

  constructor(
    private apiKey: string,
    private model: string = 'claude-sonnet-4-5-20250929',
  ) {}

  async *stream(options: AIStreamOptions): AsyncGenerator<string, void, unknown> {
    const systemMessage = options.messages.find((m) => m.role === 'system');
    const conversationMessages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 4096,
        temperature: options.temperature ?? 0.7,
        stream: true,
        ...(systemMessage ? { system: systemMessage.content } : {}),
        messages: conversationMessages,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const reader = response.body!.getReader();

    for await (const event of parseSSEStream(reader, options.signal)) {
      if (event.event === 'content_block_delta') {
        try {
          const data = JSON.parse(event.data);
          if (data.delta?.text) {
            yield data.delta.text;
          }
        } catch {
          // Skip malformed events
        }
      }
    }
  }

  async validate(): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
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
