// ─── You.com API Client ──────────────────────────────────
// Handles all You.com API endpoints with proper auth headers.
// Search-family APIs use X-API-Key; Agent APIs use Bearer token.

// ─── Response Types (raw API shapes) ─────────────────────

export interface SearchWebResult {
  url: string;
  title: string;
  description: string;
  snippets: string[];
  thumbnail_url?: string;
  page_age?: string;
  favicon_url?: string;
}

export interface SearchNewsResult {
  url: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  page_age?: string;
}

export interface SearchResponse {
  results: {
    web?: SearchWebResult[];
    news?: SearchNewsResult[];
  };
  metadata: {
    search_uuid: string;
    query: string;
    latency: number;
  };
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source_name: string;
  age: string;
  page_age?: string;
  thumbnail?: string;
}

export interface NewsResponse {
  news: {
    query: { original: string };
    results: NewsArticle[];
  };
}

export interface ContentsItem {
  url: string;
  title: string;
  html?: string | null;
  markdown?: string | null;
  metadata?: {
    site_name?: string;
    favicon_url?: string;
  };
}

export interface AgentOutputSearch {
  type: 'web_search.results';
  content: Array<{
    source_type: string;
    citation_uri: string;
    title: string;
    snippet: string;
    url: string;
    thumbnail_url?: string;
  }>;
}

export interface AgentOutputMessage {
  type: 'message.answer';
  text: string;
}

export type AgentOutput = AgentOutputSearch | AgentOutputMessage;

export interface AgentResponse {
  agent: string;
  output: AgentOutput[];
}

// ─── Client Options ──────────────────────────────────────

export interface SearchOptions {
  count?: number;
  freshness?: 'day' | 'week' | 'month' | 'year';
  country?: string;
}

export interface NewsOptions {
  count?: number;
  recency?: 'day' | 'week' | 'month';
}

// ─── YouComClient ────────────────────────────────────────

export class YouComClient {
  constructor(private apiKey: string) {}

  // Search API — GET https://ydc-index.io/v1/search
  async search(query: string, options?: SearchOptions): Promise<SearchResponse> {
    const params = new URLSearchParams({ query });
    if (options?.count) params.set('count', String(options.count));
    if (options?.freshness) params.set('freshness', options.freshness);
    if (options?.country) params.set('country', options.country);

    const res = await fetch(`https://ydc-index.io/v1/search?${params}`, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`You.com Search API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  // News API — GET https://api.ydc-index.io/livenews
  async getNews(query: string, options?: NewsOptions): Promise<NewsResponse> {
    const params = new URLSearchParams({ q: query });
    if (options?.count) params.set('count', String(options.count));
    if (options?.recency) params.set('recency', options.recency);

    const res = await fetch(`https://api.ydc-index.io/livenews?${params}`, {
      headers: { 'X-API-Key': this.apiKey },
    });

    if (!res.ok) {
      throw new Error(`You.com News API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  // Contents API — POST https://ydc-index.io/v1/contents
  async getContents(urls: string[], formats?: string[]): Promise<ContentsItem[]> {
    const res = await fetch('https://ydc-index.io/v1/contents', {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        urls,
        formats: formats ?? ['markdown', 'metadata'],
      }),
    });

    if (!res.ok) {
      throw new Error(`You.com Contents API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  // Express Agent — POST https://api.you.com/v1/agents/runs
  async expressAgent(input: string): Promise<AgentResponse> {
    const res = await fetch('https://api.you.com/v1/agents/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent: 'express',
        input,
        stream: false,
        tools: [{ type: 'web_search' }],
      }),
    });

    if (!res.ok) {
      throw new Error(`You.com Express Agent error: ${res.status} ${res.statusText}`);
    }

    return res.json();
  }

  // Validate the API key by making a lightweight search call
  async validate(): Promise<boolean> {
    try {
      await this.search('test', { count: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
