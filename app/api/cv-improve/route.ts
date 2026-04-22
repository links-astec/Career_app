// app/api/cv-improve/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groqAsk } from '@/lib/groq';
import { tavilySearch } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const { section, targetRole, company, lang = 'en' } = await req.json();

    if (!section?.trim()) {
      return NextResponse.json({ error: 'CV section required' }, { status: 400 });
    }

    const respondIn = lang === 'fr' ? 'French' : 'English';

    // Search for keywords to add for this role
    const [improved, keywords] = await Promise.allSettled([
      groqAsk(
        `You are an expert CV writer and ATS optimizer for a French AI engineering student at JUNIA. Respond in ${respondIn}.`,
        `Rewrite and significantly improve this CV section for a "${targetRole || 'AI/ML Engineer'}" role${company ? ` at ${company}` : ''}.

Original CV section:
${section}

Requirements:
1. Make each bullet start with a strong action verb
2. Add specific metrics/quantification wherever plausible (e.g. "improved accuracy by X%", "reduced training time by Y%")
3. Naturally integrate relevant ATS keywords for ${targetRole || 'AI/ML'} roles
4. Remove fluff and weak language
5. Keep it concise but impactful

Return:
**Improved Version:**
[the improved CV section]

**What Changed:**
- [3-4 specific changes made and why]

**Additional Keywords to Add:**
[5-6 relevant technical keywords not yet in the text]`,
        { maxTokens: 1000, temperature: 0.5 }
      ),

      // Get in-demand skills for this role
      tavilySearch(`${targetRole || 'AI ML engineer'} France 2025 required skills keywords CV`, {
        maxResults: 3,
        searchDepth: 'basic',
        includeAnswer: true,
      }),
    ]);

    return NextResponse.json({
      improved: improved.status === 'fulfilled' ? improved.value : null,
      marketKeywords:
        keywords.status === 'fulfilled'
          ? {
              answer: keywords.value.answer,
              sources: keywords.value.results.slice(0, 2).map((r) => ({ title: r.title, url: r.url })),
            }
          : null,
    });
  } catch (err) {
    console.error('[CV Improve API]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
