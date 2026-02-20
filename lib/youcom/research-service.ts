// ─── Research Service ────────────────────────────────────
// High-level orchestration combining multiple You.com APIs
// into a unified research result for the Research tab.

import type { ResearchResult, YouComNewsItem, YouComSource } from '@/lib/types';
import { YouComClient } from './youcom-client';
import type { AgentOutputMessage, AgentOutputSearch } from './youcom-client';

// Combine Search + Express Agent + News into one result
export async function researchTopic(
  client: YouComClient,
  topic: string,
  courseContext?: string,
): Promise<ResearchResult> {
  const enrichedQuery = courseContext
    ? `${topic} (in the context of: ${courseContext})`
    : topic;

  // Run all three APIs in parallel — don't let one failure block the rest
  const [searchResult, agentResult, newsResult] = await Promise.allSettled([
    client.search(enrichedQuery, { count: 5 }),
    client.expressAgent(enrichedQuery),
    client.getNews(topic, { count: 5 }),
  ]);

  // Extract web sources from Search API
  const webSources: YouComSource[] = [];
  if (searchResult.status === 'fulfilled') {
    for (const item of searchResult.value.results.web ?? []) {
      webSources.push({
        title: item.title,
        url: item.url,
        snippet: item.snippets?.[0] ?? item.description,
        pageAge: item.page_age,
        thumbnailUrl: item.thumbnail_url,
        faviconUrl: item.favicon_url,
      });
    }
  }

  // Extract explanation + citations from Express Agent
  let explanation = '';
  const citations: YouComSource[] = [];

  if (agentResult.status === 'fulfilled') {
    for (const output of agentResult.value.output) {
      if (output.type === 'message.answer') {
        explanation = (output as AgentOutputMessage).text;
      } else if (output.type === 'web_search.results') {
        for (const cite of (output as AgentOutputSearch).content) {
          citations.push({
            title: cite.title,
            url: cite.url,
            snippet: cite.snippet,
            thumbnailUrl: cite.thumbnail_url,
          });
        }
      }
    }
  }

  // Fallback: if Express Agent failed but Search worked, build explanation from snippets
  if (!explanation && webSources.length > 0) {
    explanation = webSources
      .map((s, i) => `[${i + 1}] ${s.snippet}`)
      .join('\n\n');
  }

  // Extract news items
  const news: YouComNewsItem[] = [];
  if (newsResult.status === 'fulfilled') {
    for (const article of newsResult.value.news.results) {
      news.push({
        title: article.title,
        url: article.url,
        description: article.description,
        source: article.source_name,
        age: article.age,
        thumbnailUrl: article.thumbnail,
      });
    }
  }

  return {
    query: topic,
    explanation,
    citations,
    webSources,
    news,
    timestamp: Date.now(),
  };
}

// Find current news about a topic (standalone)
export async function findCurrentNews(
  client: YouComClient,
  topic: string,
): Promise<YouComNewsItem[]> {
  const result = await client.getNews(topic, { count: 5 });
  return result.news.results.map((article) => ({
    title: article.title,
    url: article.url,
    description: article.description,
    source: article.source_name,
    age: article.age,
    thumbnailUrl: article.thumbnail,
  }));
}

// Search web for grounding chat responses
export async function searchForGrounding(
  client: YouComClient,
  query: string,
): Promise<YouComSource[]> {
  const result = await client.search(query, { count: 5 });
  return (result.results.web ?? []).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.snippets?.[0] ?? item.description,
    pageAge: item.page_age,
    thumbnailUrl: item.thumbnail_url,
    faviconUrl: item.favicon_url,
  }));
}
