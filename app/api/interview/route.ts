// app/api/interview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { groqChat, GroqMessage } from '@/lib/groq';

export type InterviewMode = 'technical' | 'behavioral' | 'mixed' | 'ml_deep';
export type InterviewPhase = 'intro' | 'question' | 'followup' | 'feedback' | 'complete';

export async function POST(req: NextRequest) {
  try {
    const {
      action,          // 'start' | 'answer' | 'feedback' | 'end'
      role,            // target job role
      company,         // target company
      mode,            // InterviewMode
      history,         // GroqMessage[] — full conversation so far
      userAnswer,      // candidate's answer to current question
      questionNumber,  // current Q index
      totalQuestions,  // total Q count (default 5)
      lang,            // 'en' | 'fr'
      cvSnippet,       // optional CV excerpt for context
    } = await req.json();

    const respondIn = lang === 'fr' ? 'French' : 'English';
    const total = totalQuestions || 6;

    const SYSTEM = `You are an expert technical recruiter and interview coach conducting a mock interview for a student at JUNIA (French AI engineering school, Roubaix).

Role being interviewed for: ${role || 'AI/ML Engineer Intern'}
Company: ${company || 'a French tech company'}
Interview mode: ${mode || 'mixed'}
${cvSnippet ? `Candidate CV snippet: ${cvSnippet.slice(0, 500)}` : ''}

You conduct structured, realistic interviews. You:
- Ask one question at a time
- Give detailed, constructive feedback on answers
- Follow up intelligently on vague or incomplete answers  
- Score answers from 1-10 with specific reasoning
- Adapt difficulty to a student/intern level
- Reference real France-specific context when relevant
- Respond in ${respondIn}

Interview structure: ${total} questions total, mix of ${mode === 'behavioral' ? 'behavioral STAR-format' : mode === 'technical' ? 'technical depth' : mode === 'ml_deep' ? 'deep ML theory and practical' : 'technical and behavioral'} questions.`;

    // ── START: Begin interview ──
    if (action === 'start') {
      const intro = await groqChat(
        [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `Start the interview. Introduce yourself briefly as the interviewer (1-2 sentences), set expectations (${total} questions, ~${total * 3} minutes), then ask Question 1/${total}. 

Format your response as JSON:
{
  "type": "question",
  "message": "Your intro + first question here",
  "questionNumber": 1,
  "questionText": "Just the question itself",
  "category": "Technical|Behavioral|ML Theory|Problem Solving",
  "difficulty": "Easy|Medium|Hard",
  "tips": "1 brief tip on how to approach this question type"
}`,
          },
        ],
        { json: true, maxTokens: 600, temperature: 0.8 }
      );

      const parsed = JSON.parse(intro);
      return NextResponse.json({ success: true, data: parsed });
    }

    // ── ANSWER: Process candidate's answer ──
    if (action === 'answer') {
      const messages: GroqMessage[] = [
        { role: 'system', content: SYSTEM },
        ...(history || []),
        {
          role: 'user',
          content: `The candidate answered question ${questionNumber}/${total}: "${userAnswer}"

Evaluate their answer and respond with JSON:
{
  "type": ${questionNumber >= total ? '"final_feedback"' : '"feedback_and_question"'},
  "feedback": {
    "score": 7,
    "scoreLabel": "Good",
    "what_went_well": ["Point 1", "Point 2"],
    "improvements": ["Specific improvement 1", "Specific improvement 2"],
    "model_answer_hint": "What a strong answer would include in 2-3 sentences",
    "follow_up": "Optional follow-up question if answer was vague (or null)"
  },
  "next_question": ${questionNumber >= total ? 'null' : `{
    "message": "Transition sentence + next question",
    "questionNumber": ${questionNumber + 1},
    "questionText": "Just the question itself",
    "category": "Technical|Behavioral|ML Theory|Problem Solving",
    "difficulty": "Easy|Medium|Hard",
    "tips": "1 brief approach tip"
  }`},
  "sessionProgress": {
    "questionsAnswered": ${questionNumber},
    "totalQuestions": ${total}
  }
}

Be specific and constructive. Reference the candidate's actual answer in your feedback.`,
        },
      ];

      const response = await groqChat(messages, { json: true, maxTokens: 1000, temperature: 0.7 });
      const parsed = JSON.parse(response);
      return NextResponse.json({ success: true, data: parsed });
    }

    // ── FINAL: Full session evaluation ──
    if (action === 'final') {
      const messages: GroqMessage[] = [
        { role: 'system', content: SYSTEM },
        ...(history || []),
        {
          role: 'user',
          content: `Generate a comprehensive final evaluation of this mock interview session. Return JSON:
{
  "type": "session_complete",
  "overall_score": 72,
  "grade": "B+",
  "verdict": "Ready for interviews with some prep needed",
  "category_scores": {
    "communication": 75,
    "technical_knowledge": 70,
    "problem_solving": 65,
    "self_awareness": 80
  },
  "top_strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "priority_improvements": ["Critical improvement 1", "Critical improvement 2"],
  "study_topics": ["Topic to review 1", "Topic to review 2", "Topic to review 3"],
  "hiring_recommendation": "Would recommend for next round | Would not recommend | On the fence",
  "coaching_summary": "2-3 paragraph detailed narrative coaching summary with specific advice for this role/company",
  "next_steps": ["Actionable step 1", "Actionable step 2", "Actionable step 3"]
}`,
        },
      ];

      const response = await groqChat(messages, { json: true, maxTokens: 1200, temperature: 0.6 });
      const parsed = JSON.parse(response);
      return NextResponse.json({ success: true, data: parsed });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('[Interview API]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
