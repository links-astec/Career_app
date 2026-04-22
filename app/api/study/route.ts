// app/api/study/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groqAsk } from '@/lib/groq';
import { tavilySearch } from '@/lib/tavily';

export async function POST(req: NextRequest) {
  try {
    const { topic, lang = 'en', mode = 'explain' } = await req.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'Topic required' }, { status: 400 });
    }

    const respondIn = lang === 'fr' ? 'French' : 'English';

    if (mode === 'explain') {
      // Deep explanation with optional web context
      const [explanation, webContext] = await Promise.allSettled([
        groqAsk(
          `You are a brilliant AI/ML tutor for an engineering student at JUNIA (France). Be precise, technical but accessible. Respond in ${respondIn}. Use markdown formatting with headers and code blocks where helpful.`,
          `Explain "${topic}" comprehensively covering:

## Core Concept
2-3 clear sentences explaining the fundamental idea.

## Key Mechanism / Formula
The most important equation, algorithm, or mechanism (use LaTeX notation if math: $formula$).

## Intuition
An analogy or intuitive explanation that makes it click.

## Implementation (Python)
A minimal, commented code example (10-15 lines max).

## Common Interview Questions
3 typical interview questions about this topic with brief answer hints.

## Key Papers / Resources
2-3 seminal papers or resources to go deeper.`,
          { maxTokens: 1500, temperature: 0.4 }
        ),
        tavilySearch(`${topic} machine learning explained 2024 2025`, {
          maxResults: 3,
          searchDepth: 'basic',
          includeAnswer: false,
        }),
      ]);

      return NextResponse.json({
        explanation: explanation.status === 'fulfilled' ? explanation.value : 'Failed to generate explanation',
        sources:
          webContext.status === 'fulfilled'
            ? webContext.value.results.slice(0, 3).map((r) => ({
                title: r.title,
                url: r.url,
              }))
            : [],
      });
    }

    if (mode === 'quiz') {
      const quiz = await groqAsk(
        `Quiz generator for AI/ML engineering students. Respond in ${respondIn}. Return ONLY valid JSON.`,
        `Generate a 5-question multiple choice quiz on "${topic}". JSON format:
{
  "topic": "${topic}",
  "questions": [
    {
      "id": 1,
      "question": "Question text",
      "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
      "correct": "A",
      "explanation": "Why A is correct and others are wrong"
    }
  ]
}`,
        { json: true, maxTokens: 1200 }
      );

      return NextResponse.json({ quiz: JSON.parse(quiz) });
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  } catch (err) {
    console.error('[Study API]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
