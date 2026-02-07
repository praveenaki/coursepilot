/**
 * Page content extraction strategies for different course platforms.
 * Used by the content script to extract clean text from the DOM.
 */

export interface ExtractionResult {
  content: string;
  title: string;
  platform: string;
}

const PLATFORM_SELECTORS: Record<string, string[]> = {
  docsify: ['.markdown-section', '.content'],
  gitbook: ['.markdown-body', '.page-body'],
  readthedocs: ['.document', '[role="main"]', '.rst-content'],
  generic: ['article', 'main', '[role="main"]', '.content', '#content'],
};

export function extractPageContent(doc: Document = document): ExtractionResult {
  const title = doc.title || '';

  // Try each platform's selectors
  for (const [platform, selectors] of Object.entries(PLATFORM_SELECTORS)) {
    for (const selector of selectors) {
      const el = doc.querySelector(selector);
      if (el && el.textContent && el.textContent.trim().length > 100) {
        return {
          content: cleanText(el.textContent),
          title,
          platform,
        };
      }
    }
  }

  // Fallback: full body minus navigation
  const body = doc.body.cloneNode(true) as HTMLElement;
  for (const tag of ['nav', 'header', 'footer', 'script', 'style', 'aside', '.sidebar', '#sidebar']) {
    body.querySelectorAll(tag).forEach((el) => el.remove());
  }

  return {
    content: cleanText(body.textContent ?? ''),
    title,
    platform: 'unknown',
  };
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 50000);
}
