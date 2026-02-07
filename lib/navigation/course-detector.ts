import type { CourseInfo, CoursePage, CoursePlatform } from '@/lib/types';

/**
 * Detects if the current page is part of a course and extracts structure.
 * Supports Docsify, GitBook, ReadTheDocs, and generic sidebar-based courses.
 */

export function detectCourse(doc: Document = document): CourseInfo | null {
  const url = doc.location.href;
  const baseUrl = doc.location.origin + doc.location.pathname.split('/').slice(0, -1).join('/');

  // Try platform-specific detection
  const docsify = detectDocsify(doc, baseUrl);
  if (docsify) return docsify;

  const gitbook = detectGitBook(doc, baseUrl);
  if (gitbook) return gitbook;

  // Generic sidebar detection
  const generic = detectGenericSidebar(doc, baseUrl);
  if (generic) return generic;

  return null;
}

function detectDocsify(doc: Document, baseUrl: string): CourseInfo | null {
  // Docsify indicators: window.$docsify, .sidebar-nav, #app
  const sidebarNav = doc.querySelector('.sidebar-nav');
  const docsifyApp = doc.querySelector('#app');

  if (!sidebarNav && !docsifyApp) return null;

  const links = sidebarNav?.querySelectorAll('a[href]') ?? [];
  const pages = extractPagesFromLinks(links, baseUrl);

  if (pages.length < 2) return null;

  return {
    id: `docsify-${hashString(baseUrl)}`,
    title: doc.title || 'Docsify Course',
    baseUrl,
    platform: 'docsify',
    pages,
    detectedAt: Date.now(),
  };
}

function detectGitBook(doc: Document, baseUrl: string): CourseInfo | null {
  const gitbookNav = doc.querySelector('.gitbook-root nav, [data-testid="page.tableOfContents"]');
  if (!gitbookNav) return null;

  const links = gitbookNav.querySelectorAll('a[href]');
  const pages = extractPagesFromLinks(links, baseUrl);

  if (pages.length < 2) return null;

  return {
    id: `gitbook-${hashString(baseUrl)}`,
    title: doc.title || 'GitBook Course',
    baseUrl,
    platform: 'gitbook',
    pages,
    detectedAt: Date.now(),
  };
}

function detectGenericSidebar(doc: Document, baseUrl: string): CourseInfo | null {
  // Look for sidebar/nav elements with multiple internal links
  const navSelectors = ['nav', 'aside', '.sidebar', '#sidebar', '[role="navigation"]'];

  for (const selector of navSelectors) {
    const nav = doc.querySelector(selector);
    if (!nav) continue;

    const links = nav.querySelectorAll('a[href]');
    const pages = extractPagesFromLinks(links, baseUrl);

    if (pages.length >= 3) {
      return {
        id: `generic-${hashString(baseUrl)}`,
        title: doc.title || 'Course',
        baseUrl,
        platform: 'generic',
        pages,
        detectedAt: Date.now(),
      };
    }
  }

  return null;
}

function extractPagesFromLinks(
  links: NodeListOf<Element>,
  baseUrl: string,
): CoursePage[] {
  const pages: CoursePage[] = [];
  const seen = new Set<string>();
  let order = 0;

  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http')) return;

    const fullUrl = new URL(href, baseUrl).href;
    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    pages.push({
      url: fullUrl,
      title: link.textContent?.trim() || href,
      path: href,
      order: order++,
    });
  });

  return pages;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
