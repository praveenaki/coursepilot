import { useState, useEffect, useCallback, useRef } from 'react';
import { sendToBackground } from '@/lib/messaging';
import { pendingResearchStorage } from '@/utils/storage';

interface SelectionPosition {
  x: number;
  y: number;
  text: string;
}

export default function ContentApp() {
  const [showFAB, setShowFAB] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selection, setSelection] = useState<SelectionPosition | null>(null);
  const [mastery, setMastery] = useState<number | null>(null);
  const extractedRef = useRef(false);

  // ── Extract page content on load ──────────────────────

  useEffect(() => {
    if (extractedRef.current) return;
    extractedRef.current = true;

    const timer = setTimeout(() => {
      const content = extractPageContent();
      if (content) {
        sendToBackground({
          type: 'PAGE_CONTENT_EXTRACTED',
          payload: {
            url: window.location.href,
            title: document.title,
            content,
          },
        });
      }
    }, 1500); // Wait for dynamic content to load

    return () => clearTimeout(timer);
  }, []);

  // ── Scroll progress tracking ──────────────────────────

  useEffect(() => {
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (scrollHeight > 0) {
          const progress = Math.min(window.scrollY / scrollHeight, 1);
          setScrollProgress(progress);

          // Show FAB when user has scrolled past 70%
          if (progress > 0.7) {
            setShowFAB(true);
          }

          // Report to background (debounced by rAF)
          sendToBackground({
            type: 'SCROLL_PROGRESS',
            payload: { url: window.location.href, progress },
          });
        }
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ── Text selection handler ────────────────────────────

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      const sel = window.getSelection();
      const text = sel?.toString().trim();

      if (text && text.length > 10) {
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSelection({
          x: rect.left + rect.width / 2,
          y: rect.top - 10,
          text,
        });
      } else {
        // Small delay to allow button clicks to process
        setTimeout(() => setSelection(null), 200);
      }
    }

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  // ── Listen for messages from background ───────────────

  useEffect(() => {
    function onMessage(message: { type: string; payload?: unknown }) {
      if (message.type === 'SHOW_FAB') {
        setShowFAB((message.payload as { show: boolean }).show);
      } else if (message.type === 'PAGE_MASTERED') {
        setMastery((message.payload as { score: number }).score);
      }
    }

    browser.runtime.onMessage.addListener(onMessage);
    return () => browser.runtime.onMessage.removeListener(onMessage);
  }, []);

  // ── Handlers ──────────────────────────────────────────

  const handleQuizClick = useCallback(() => {
    sendToBackground({
      type: 'QUIZ_REQUESTED',
      payload: { url: window.location.href },
    });
  }, []);

  const handleExplainClick = useCallback(() => {
    if (!selection) return;
    sendToBackground({
      type: 'TEXT_SELECTED',
      payload: { text: selection.text, url: window.location.href },
    });
    setSelection(null);
  }, [selection]);

  const handleResearchClick = useCallback(async () => {
    if (!selection) return;
    await pendingResearchStorage.setValue({
      text: selection.text,
      pageUrl: window.location.href,
      timestamp: Date.now(),
    });
    // Open side panel (it will auto-switch to Research tab via pendingResearchStorage watcher)
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      await browser.sidePanel.open({ tabId: tab.id });
    }
    setSelection(null);
  }, [selection]);

  return (
    <>
      {/* Mastery Badge */}
      {mastery !== null && (
        <div className="cp-mastery-badge">
          <span>✓</span>
          <span>Mastered {mastery}%</span>
        </div>
      )}

      {/* FAB Button */}
      {showFAB && (
        <button className="cp-fab" onClick={handleQuizClick}>
          <span className="cp-fab-icon">🎯</span>
          <span>Ready for quiz?</span>
        </button>
      )}

      {/* Selection Popup */}
      {selection && (
        <div
          className="cp-selection-popup"
          style={{
            left: `${Math.max(10, selection.x - 90)}px`,
            top: `${Math.max(10, selection.y - 40)}px`,
          }}
        >
          <button className="cp-selection-btn" onClick={handleExplainClick}>
            💡 Explain
          </button>
          <button className="cp-selection-btn" onClick={handleResearchClick}>
            🔍 Research
          </button>
        </div>
      )}
    </>
  );
}

// ─── Page Content Extraction ──────────────────────────────

function extractPageContent(): string {
  // Try common course content selectors
  const selectors = [
    '.markdown-section', // Docsify
    '.markdown-body',    // GitBook
    'article',           // Generic
    '[role="main"]',     // ARIA
    '.content',          // Common
    'main',              // HTML5
    '#content',          // Common ID
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent && el.textContent.trim().length > 100) {
      return cleanText(el.textContent);
    }
  }

  // Fallback: body text (stripped of nav, header, footer)
  const body = document.body.cloneNode(true) as HTMLElement;
  for (const tag of ['nav', 'header', 'footer', 'script', 'style', 'aside']) {
    body.querySelectorAll(tag).forEach((el) => el.remove());
  }

  return cleanText(body.textContent ?? '');
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 50000); // Cap at ~12K tokens
}
