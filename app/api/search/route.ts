// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { tavilySearch } from '@/lib/tavily';
import { groqAsk } from '@/lib/groq';

export type SearchMode = 'jobs' | 'company' | 'salary' | 'skills' | 'news' | 'general';

export async function POST(req: NextRequest) {
  try {
    const { query, mode = 'general', lang = 'en' } = await req.json();

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Build context-aware search query
    const enrichedQuery = buildQuery(query, mode);

    const [searchData, synthesis] = await Promise.allSettled([
      tavilySearch(enrichedQuery, {
        maxResults: 6,
        searchDepth: mode === 'general' ? 'basic' : 'advanced',
        includeAnswer: true,
        topic: mode === 'news' ? 'news' : 'general',
        days: mode === 'news' ? 3 : 30,
      }),
      // Simultaneously synthesize with Groq
      (async () => {
        // We'll do this after getting results
        return null;
      })(),
    ]);

    if (searchData.status === 'rejected') {
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const { results, answer } = searchData.value;

    // Synthesize results with Groq for a clean summary
    const context = results.map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, 400)}`).join('\n\n');
    const respondIn = lang === 'fr' ? 'French' : 'English';

    let summary = answer || '';
    try {
      summary = await groqAsk(
        `You are a career research assistant for a French AI engineering student (JUNIA, Roubaix). Be concise, specific, and practical. Respond in ${respondIn}.`,
        `Based on these search results, provide a clear, useful summary for the query: "${query}"

Search results:
${context}

Provide:
1. A direct answer / key findings (3-4 sentences)
2. 3-5 specific actionable takeaways
3. Any salary/requirements data if available

Keep it focused and practical for a student applying to AI/ML roles in France.`,
        { maxTokens: 800 }
      );
    } catch {
      summary = answer || 'Search completed. See results below.';
    }

    return NextResponse.json({
      query: enrichedQuery,
      originalQuery: query,
      summary,
      results: results.slice(0, 5).map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content.slice(0, 300),
        date: r.published_date,
      })),
    });
  } catch (err) {
    console.error('[Search API]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function buildQuery(query: string, mode: SearchMode): string {
  const base = query.trim();
  switch (mode) {
    case 'jobs':
      return `${base} AI ML internship France 2025 job offer`;
    case 'company':
      return `${base} company AI division culture France engineer`;
    case 'salary':
      return `${base} salary France AI ML engineer ingénieur stage rémunération`;
    case 'skills':
      return `${base} required skills 2025 AI machine learning France`;
    case 'news':
      return `${base} AI tech news France 2025`;
    default:
      return base;
  }
}
