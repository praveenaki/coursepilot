import { useState, useEffect, useCallback, useRef } from 'react';
import { sendToBackground } from '@/lib/messaging';
import { pendingResearchStorage, youcomApiKeyStorage } from '@/utils/storage';
import type { ResearchResult, YouComSource, YouComNewsItem } from '@/lib/types';

export default function ResearchView() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const pendingHandledRef = useRef(false);

  // Check if You.com key is configured
  useEffect(() => {
    youcomApiKeyStorage.getValue().then((key) => setHasApiKey(!!key));
    const unwatch = youcomApiKeyStorage.watch((key) => setHasApiKey(!!key));
    return unwatch;
  }, []);

  // Watch for pending research requests (from content script "Research" button)
  useEffect(() => {
    pendingResearchStorage.getValue().then((pending) => {
      if (pending && Date.now() - pending.timestamp < 10000) {
        setQuery(pending.text);
        pendingHandledRef.current = true;
        pendingResearchStorage.setValue(null);
        // Auto-trigger research
        doResearch(pending.text);
      }
    });

    const unwatch = pendingResearchStorage.watch((pending) => {
      if (pending && Date.now() - pending.timestamp < 10000 && !pendingHandledRef.current) {
        setQuery(pending.text);
        pendingHandledRef.current = true;
        pendingResearchStorage.setValue(null);
        doResearch(pending.text);
      }
    });

    return unwatch;
  }, []);

  const doResearch = useCallback(async (topic: string) => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    pendingHandledRef.current = false;

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const response = await sendToBackground({
        type: 'RESEARCH_TOPIC',
        payload: { topic: topic.trim(), pageUrl: tab?.url },
      }) as { ok?: boolean; result?: ResearchResult; error?: string };

      if (response.error) {
        setError(response.error);
      } else if (response.result) {
        setResult(response.result);
      }
    } catch (err) {
      setError('Research request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    doResearch(query);
  }, [query, doResearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  // No API key configured
  if (!hasApiKey) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
        <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Web Research</h3>
        <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '13px', lineHeight: 1.6, marginBottom: '16px' }}>
          Get AI explanations with real web sources and citations.
          Powered by You.com APIs.
        </p>
        <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '12px' }}>
          Add your You.com API key in Settings → Web Research to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search Input */}
      <div style={{ padding: '12px', borderBottom: '1px solid var(--color-cp-border)' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Research any topic..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px 12px',
              background: 'var(--color-cp-surface)',
              color: 'var(--color-cp-text)',
              border: '1px solid var(--color-cp-border)',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || loading}
            style={{
              padding: '10px 16px',
              background: 'var(--color-cp-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !query.trim() || loading ? 'default' : 'pointer',
              opacity: !query.trim() || loading ? 0.5 : 1,
              fontWeight: 600,
              fontSize: '13px',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Researching...' : 'Research'}
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px', animation: 'pulse 1.5s ease-in-out infinite' }}>🔍</div>
            <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '13px' }}>
              Searching the web, analyzing sources, finding news...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            padding: '12px',
            background: 'var(--color-cp-danger-bg, rgba(239,68,68,0.1))',
            border: '1px solid var(--color-cp-danger, #ef4444)',
            borderRadius: '8px',
            color: 'var(--color-cp-danger, #ef4444)',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* AI Explanation */}
            {result.explanation && (
              <section>
                <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-cp-primary-light)' }}>
                  AI Explanation
                </h3>
                <div style={{
                  padding: '12px',
                  background: 'var(--color-cp-surface)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--color-cp-text)',
                }}>
                  {result.explanation}
                </div>
              </section>
            )}

            {/* Citations from Express Agent */}
            {result.citations.length > 0 && (
              <section>
                <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-cp-primary-light)' }}>
                  Citations ({result.citations.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.citations.map((cite, i) => (
                    <SourceCard key={i} source={cite} index={i + 1} />
                  ))}
                </div>
              </section>
            )}

            {/* Web Sources from Search API */}
            {result.webSources.length > 0 && (
              <section>
                <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-cp-primary-light)' }}>
                  Web Sources ({result.webSources.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.webSources.map((source, i) => (
                    <SourceCard key={i} source={source} />
                  ))}
                </div>
              </section>
            )}

            {/* News */}
            {result.news.length > 0 && (
              <section>
                <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-cp-primary-light)' }}>
                  Related News ({result.news.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {result.news.map((item, i) => (
                    <NewsCard key={i} item={item} />
                  ))}
                </div>
              </section>
            )}

            {/* No results */}
            {!result.explanation && result.webSources.length === 0 && result.news.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-cp-text-muted)', fontSize: '13px' }}>
                No results found. Try rephrasing your query.
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && !result && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</div>
            <h3 style={{ fontWeight: 600, marginBottom: '8px' }}>Web Research</h3>
            <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '13px', lineHeight: 1.6 }}>
              Enter a topic to get an AI-generated explanation backed by real web sources and current news.
            </p>
            <p style={{ color: 'var(--color-cp-text-muted)', fontSize: '11px', marginTop: '8px' }}>
              Powered by You.com Search, Express Agent, and News APIs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Source Card Component ────────────────────────────────

function SourceCard({ source, index }: { source: YouComSource; index?: number }) {
  const hostname = (() => {
    try { return new URL(source.url).hostname.replace('www.', ''); }
    catch { return source.url; }
  })();

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '10px 12px',
        background: 'var(--color-cp-surface)',
        border: '1px solid var(--color-cp-border)',
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-cp-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-cp-border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
        {index !== undefined && (
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            background: 'var(--color-cp-primary)',
            color: 'white',
            borderRadius: '4px',
            padding: '1px 5px',
            minWidth: '18px',
            textAlign: 'center',
          }}>
            {index}
          </span>
        )}
        {source.faviconUrl && (
          <img src={source.faviconUrl} alt="" style={{ width: '14px', height: '14px', borderRadius: '2px' }} />
        )}
        <span style={{ fontSize: '11px', color: 'var(--color-cp-text-muted)' }}>{hostname}</span>
        {source.pageAge && (
          <span style={{ fontSize: '10px', color: 'var(--color-cp-text-muted)' }}>{source.pageAge}</span>
        )}
      </div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-cp-primary-light)', marginBottom: '3px' }}>
        {source.title}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', lineHeight: 1.5 }}>
        {source.snippet.slice(0, 200)}{source.snippet.length > 200 ? '...' : ''}
      </div>
    </a>
  );
}

// ─── News Card Component ─────────────────────────────────

function NewsCard({ item }: { item: YouComNewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        gap: '10px',
        padding: '10px 12px',
        background: 'var(--color-cp-surface)',
        border: '1px solid var(--color-cp-border)',
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'border-color 0.15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-cp-primary)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-cp-border)')}
    >
      {item.thumbnailUrl && (
        <img
          src={item.thumbnailUrl}
          alt=""
          style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}>
          {item.title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--color-cp-text-muted)', lineHeight: 1.4 }}>
          {item.description.slice(0, 120)}{item.description.length > 120 ? '...' : ''}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-cp-text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
          <span style={{ fontWeight: 500 }}>{item.source}</span>
          <span>{item.age}</span>
        </div>
      </div>
    </a>
  );
}
