// lib/tavily.ts
// Tavily Search API — best-in-class AI-focused web search

const TAVILY_URL = 'https://api.tavily.com/search';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilyResponse {
  query: string;
  results: TavilyResult[];
  answer?: string;
}

export async function tavilySearch(
  query: string,
  options: {
    maxResults?: number;
    searchDepth?: 'basic' | 'advanced';
    includeAnswer?: boolean;
    topic?: 'general' | 'news';
    days?: number; // news recency in days
  } = {}
): Promise<TavilyResponse> {
  const {
    maxResults = 5,
    searchDepth = 'basic',
    includeAnswer = true,
    topic = 'general',
    days = 7,
  } = options;

  const res = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      search_depth: searchDepth,
      include_answer: includeAnswer,
      topic,
      days,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Tavily error ${res.status}: ${err}`);
  }

  return res.json();
}
