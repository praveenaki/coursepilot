import type { SSEEvent } from '@/lib/ai/types';

/**
 * Parse an SSE stream into individual events.
 * Works with Anthropic, OpenAI, and OpenAI-compatible endpoints.
 */
export async function* parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) return;

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    let currentEvent: Partial<SSEEvent> = {};

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent.event = line.slice(7).trim();
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        currentEvent.data = data;
        yield currentEvent as SSEEvent;
        currentEvent = {};
      } else if (line === '') {
        currentEvent = {};
      }
    }
  }
}

/**
 * Parse an NDJSON stream (used by Gemini).
 */
export async function* parseNDJSONStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<unknown, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    if (signal?.aborted) return;

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Gemini wraps response in a JSON array, handle both array items and plain objects
    // Strip leading [ or , and trailing ]
    const cleaned = buffer.replace(/^\s*[\[,]\s*/, '').replace(/\s*\]\s*$/, '');

    try {
      const parsed = JSON.parse(cleaned);
      yield parsed;
      buffer = '';
    } catch {
      // Incomplete JSON, wait for more data
    }
  }
}

/**
 * Estimate token count from text (rough: ~4 chars per token).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
