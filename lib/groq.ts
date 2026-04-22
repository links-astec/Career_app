// lib/groq.ts
// Groq API helper — using llama-3.3-70b-versatile (fastest, best quality)

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function groqChat(
  messages: GroqMessage[],
  options: { json?: boolean; maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const { json = false, maxTokens = 1024, temperature = 0.7 } = options;

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: maxTokens,
    temperature,
    messages,
  };
  if (json) body.response_format = { type: 'json_object' };

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Convenience: single system+user call
export async function groqAsk(
  system: string,
  user: string,
  options?: { json?: boolean; maxTokens?: number; temperature?: number }
): Promise<string> {
  return groqChat([{ role: 'system', content: system }, { role: 'user', content: user }], options);
}
