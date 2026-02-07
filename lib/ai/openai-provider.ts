import type { AIProvider, AIStreamOptions } from '@/lib/types';
import { parseSSEStream } from '@/utils/streaming';

export class OpenAIProvider implements AIProvider {
  readonly type = 'openai' as const;

  constructor(
    private apiKey: string,
    private model: string = 'gpt-4o',
  ) {}

  async *stream(options: AIStreamOptions): AsyncGenerator<string, void, unknown> {
    const messages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
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
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
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
