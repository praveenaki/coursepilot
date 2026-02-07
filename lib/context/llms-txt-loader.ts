/**
 * Loads llms.txt and llms-full.txt from a course's root URL.
 * Follows the llmstxt.org standard for AI-friendly content indexing.
 */

export interface LlmsTxtResult {
  found: boolean;
  content?: string;
  type?: 'llms.txt' | 'llms-full.txt';
  url?: string;
}

export async function loadLlmsTxt(baseUrl: string): Promise<LlmsTxtResult> {
  const origin = new URL(baseUrl).origin;

  // Try llms-full.txt first (complete content is more useful)
  for (const file of ['llms-full.txt', 'llms.txt']) {
    try {
      const url = `${origin}/${file}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/plain' },
      });

      if (response.ok) {
        const content = await response.text();
        if (content.trim().length > 50) {
          return {
            found: true,
            content,
            type: file as 'llms.txt' | 'llms-full.txt',
            url,
          };
        }
      }
    } catch {
      // Not found, try next
    }
  }

  return { found: false };
}
