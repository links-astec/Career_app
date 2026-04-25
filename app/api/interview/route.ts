// app/api/interview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groqChat, GroqMessage } from '@/lib/groq';

export type InterviewMode = 'technical' | 'behavioral' | 'mixed' | 'ml_deep';

export async function POST(req: NextRequest) {
  try {
    const {
      action,
      role,
      company,
      mode,
      history,
      userAnswer,
      questionNumber,
      totalQuestions,
      lang,
      cvSnippet,
    } = await req.json();

    const respondIn = lang === 'fr' ? 'French' : 'English';
    const total = totalQuestions || 6;

    const SYSTEM = `You are a senior technical recruiter at ${company || 'a leading French tech company'} conducting a real job interview for a ${role || 'AI/ML Engineer Intern'} position. The candidate is a student at JUNIA engineering school in Roubaix, France.

Interview mode: ${mode || 'mixed'} — ${mode === 'behavioral' ? 'STAR-format behavioral' : mode === 'technical' ? 'technical depth' : mode === 'ml_deep' ? 'deep ML/AI theory and practical' : 'mix of technical and behavioral'} questions.
${cvSnippet ? `Candidate background: ${cvSnippet.slice(0, 400)}` : ''}

RULES — this must feel like a REAL interview conversation:
- Speak naturally as a human interviewer: warm but professional
- NEVER give scores, ratings, feedback boxes, or bullet points mid-interview
- React briefly and naturally to what they said (1 sentence) before the next question
- Examples of natural reactions: "That's an interesting approach.", "Right, and how would that scale?", "I see what you mean.", "Okay, moving on —"
- You may ask one short follow-up if the answer is genuinely too vague
- Keep ALL responses under 4 sentences — you're interviewing, not lecturing
- This is a flowing conversation. Do NOT summarize their answer back to them
- Respond entirely in ${respondIn}`;

    // ── START ──
    if (action === 'start') {
      const res = await groqChat([
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Start the interview. In 2 sentences max: introduce yourself (first name + role), say you have ${total} questions, then immediately ask question 1. No fluff. Return JSON:
{ "message": "full intro + first question text", "questionNumber": 1, "isFollowUp": false }`,
        },
      ], { json: true, maxTokens: 350, temperature: 0.85 });

      const parsed = JSON.parse(res);
      return NextResponse.json({ success: true, data: { type: 'question', ...parsed } });
    }

    // ── ANSWER ──
    if (action === 'answer') {
      const isLast = questionNumber >= total;

      const messages: GroqMessage[] = [
        { role: 'system', content: SYSTEM },
        ...(history || []),
        {
          role: 'user',
          content: isLast
            ? `Candidate just answered your last question (Q${questionNumber}/${total}): "${userAnswer}"

React in 1-2 sentences naturally, then close the interview: thank them, say you'll be in touch. No feedback, no scores. Return JSON:
{ "message": "closing message", "questionNumber": ${questionNumber}, "isFollowUp": false, "isComplete": true }`
            : `Candidate answered Q${questionNumber}/${total}: "${userAnswer}"

React in 1 sentence (natural, neutral — no scoring/praise), then ask Q${questionNumber + 1}/${total}. If answer was genuinely too short/vague, ask a brief follow-up instead (set isFollowUp: true, keep questionNumber: ${questionNumber}). Return JSON:
{ "message": "reaction + next question", "questionNumber": ${questionNumber + 1}, "isFollowUp": false }`,
        },
      ];

      const response = await groqChat(messages, { json: true, maxTokens: 320, temperature: 0.82 });
      const parsed = JSON.parse(response);
      return NextResponse.json({
        success: true,
        data: { type: parsed.isComplete ? 'complete' : 'question', ...parsed },
      });
    }

    // ── FINAL DEBRIEF ──
    if (action === 'final') {
      const messages: GroqMessage[] = [
        { role: 'system', content: SYSTEM },
        ...(history || []),
        {
          role: 'user',
          content: `Interview is over. Generate a thorough post-interview debrief based on the full conversation. Be specific — reference actual things the candidate said. Return JSON:
{
  "overall_score": 72,
  "grade": "B+",
  "verdict": "Strong candidate with some gaps",
  "hire_signal": "Recommend for next round",
  "category_scores": { "communication": 75, "technical_knowledge": 70, "problem_solving": 68, "confidence": 80 },
  "top_strengths": ["Specific strength from their answers", "Another strength", "Third"],
  "priority_improvements": ["Most critical gap with advice", "Second gap"],
  "question_breakdown": [{ "q": "Short question summary", "rating": "Strong", "note": "One observation" }],
  "study_topics": ["Topic 1", "Topic 2", "Topic 3"],
  "coaching_summary": "3-4 sentence personal coaching note referencing specific things they actually said in this interview",
  "next_steps": ["Concrete action 1", "Concrete action 2"]
}`,
        },
      ];

      const response = await groqChat(messages, { json: true, maxTokens: 1400, temperature: 0.6 });
      const parsed = JSON.parse(response);
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[Interview API]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}