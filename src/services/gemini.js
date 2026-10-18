const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_REPLY_CHARS = 8000;

export class GeminiApiError extends Error {
  constructor(status, message = 'Gemini API request failed') {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
  }
}

export async function generateTutorReply({
  apiKey,
  model = DEFAULT_MODEL,
  systemInstruction,
  messages,
  maxOutputTokens = 600,
  fetchImpl = fetch
}) {
  if (typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    throw new Error('Gemini API key is not configured.');
  }
  if (typeof model !== 'string' || !/^gemini-[a-zA-Z0-9.-]{1,80}$/.test(model)) {
    throw new Error('Invalid Gemini model configuration.');
  }
  if (typeof systemInstruction !== 'string' || !systemInstruction.trim()) {
    throw new Error('System instruction is required.');
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 13) {
    throw new Error('Invalid Gemini conversation history.');
  }
  if (!Number.isInteger(maxOutputTokens) || maxOutputTokens < 64 || maxOutputTokens > 1200) {
    throw new Error('Invalid Gemini output token limit.');
  }

  const contents = messages.map((message) => {
    if (
      !message ||
      !['user', 'model'].includes(message.role) ||
      typeof message.content !== 'string' ||
      !message.content.trim()
    ) {
      throw new Error('Invalid Gemini message.');
    }
    return { role: message.role, parts: [{ text: message.content }] };
  });
  if (contents.at(-1).role !== 'user') {
    throw new Error('Gemini conversation must end with a user message.');
  }

  let response;
  try {
    response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            maxOutputTokens,
            temperature: 0.6
          }
        }),
        signal: AbortSignal.timeout(45000)
      }
    );
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') throw error;
    throw new Error('Unable to connect to Gemini API.');
  }

  if (!response.ok) {
    throw new GeminiApiError(response.status);
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Gemini API returned invalid JSON.');
  }

  const candidate = result?.candidates?.[0];
  const parts = candidate?.content?.parts;
  const text = Array.isArray(parts)
    ? parts.filter((part) => typeof part?.text === 'string').map((part) => part.text).join('').trim()
    : '';

  if (!text) {
    throw new Error('Gemini API returned no text candidate.');
  }
  if (text.length > MAX_REPLY_CHARS) {
    throw new Error('Gemini API reply exceeded the output size limit.');
  }
  return text;
}
