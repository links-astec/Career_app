// app/api/ats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groqAsk } from '@/lib/groq';
import { tavilySearch } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const { cvText, jobTitle, company, jobDescription, jobLang, responseLang } = await req.json();

    if (!cvText?.trim() || !jobDescription?.trim()) {
      return NextResponse.json({ error: 'CV and job description are required' }, { status: 400 });
    }

    // Parallel: ATS analysis + market context search
    const [atsResult, marketData] = await Promise.allSettled([
      groqAsk(
        `You are an expert ATS (Applicant Tracking System) analyzer and career coach for a French AI engineering student at JUNIA, Roubaix.
The job description language is ${jobLang === 'fr' ? 'French' : 'English'}.
Respond in ${responseLang === 'fr' ? 'French' : 'English'}.
Return ONLY valid JSON with no markdown fences.`,
        `Deeply analyze this CV against the job description. Return JSON exactly:
{
  "score": 78,
  "keywords_score": 82,
  "skills_score": 75,
  "experience_score": 70,
  "format_score": 85,
  "education_match": 90,
  "verdict": "Strong Match",
  "verdict_color": "green",
  "keywords_found": ["Python", "Machine Learning", "PyTorch"],
  "keywords_partial": ["Deep Learning", "NLP"],
  "keywords_missing": ["Docker", "MLOps", "Kubernetes"],
  "strengths": ["Strong ML fundamentals visible", "Good project experience"],
  "weaknesses": ["No MLOps/deployment experience mentioned", "Missing quantified results"],
  "suggestions": [
    "Add Docker and containerization to skills section",
    "Add quantified results to each experience bullet (accuracy %, speedup factor)",
    "Mention any model deployment or API building experience"
  ],
  "recommendations": "3-4 sentence detailed paragraph with specific, actionable advice.",
  "salary_estimate": "35,000–45,000 EUR/year (internship)",
  "match_level": "strong"
}

CV TEXT:
${cvText.slice(0, 3000)}

JOB TITLE: ${jobTitle}
COMPANY: ${company}
JOB DESCRIPTION:
${jobDescription.slice(0, 3000)}`,
        { json: true, maxTokens: 1500 }
      ),

      // Search for company + role market info
      tavilySearch(`${company} ${jobTitle} internship France requirements 2025`, {
        maxResults: 3,
        searchDepth: 'basic',
        includeAnswer: true,
      }),
    ]);

    let result = null;
    let marketContext = null;

    if (atsResult.status === 'fulfilled') {
      try {
        result = JSON.parse(atsResult.value);
      } catch {
        result = null;
      }
    }

    if (marketData.status === 'fulfilled') {
      marketContext = {
        answer: marketData.value.answer,
        sources: marketData.value.results.slice(0, 3).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.content.slice(0, 200),
        })),
      };
    }

    if (!result) {
      return NextResponse.json({ error: 'Analysis failed, try again' }, { status: 500 });
    }

    return NextResponse.json({ result, marketContext });
  } catch (err) {
    console.error('[ATS API]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
