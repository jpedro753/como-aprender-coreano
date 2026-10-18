import { createHmac } from 'node:crypto';
import { generateTutorReply, GeminiApiError } from '../../src/services/gemini.js';
import {
  buildTutorSystemInstruction,
  sanitizeUserContext,
  validateTutorRequest
} from '../../src/services/tutor-request.js';

const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 12000;
const MAX_RESPONSE_TOKENS = readIntegerSetting('HANEUL_MAX_RESPONSE_TOKENS', 600, 64, 1200);
const SESSION_HOURLY_LIMIT = readIntegerSetting('HANEUL_SESSION_HOURLY_LIMIT', 20, 1, 200);
const IP_HOURLY_LIMIT = readIntegerSetting('HANEUL_IP_HOURLY_LIMIT', 60, 1, 500);
const MAX_RATE_LIMIT_KEYS = 10000;
const WINDOW_MS = 60 * 60 * 1000;
const rateLimits = new Map();
let concurrentRequests = 0;
const MAX_CONCURRENT_REQUESTS = readIntegerSetting('HANEUL_MAX_CONCURRENT_REQUESTS', 4, 1, 20);

export default async function handler(request, context) {
  const pathname = new URL(request.url).pathname;
  if (!['/api/health', '/api/chat'].includes(pathname)) {
    return jsonResponse(404, { error: 'Endpoint não encontrado.' });
  }

  if (!isSameOrigin(request)) {
    return jsonResponse(403, { error: 'Origem não autorizada.' });
  }

  if (pathname === '/api/health') {
    if (request.method !== 'GET') {
      return jsonResponse(405, { error: 'Método não permitido.' }, { Allow: 'GET' });
    }
    return jsonResponse(200, {
      configured: Boolean(process.env.GEMINI_API_KEY),
      provider: 'Gemini'
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido.' }, { Allow: 'POST' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(503, {
      error: 'O tutor de IA ainda não está configurado. Defina GEMINI_API_KEY nas variáveis de ambiente do Netlify.'
    });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    return jsonResponse(415, { error: 'Envie a solicitação como application/json.' });
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonResponse(error.statusCode || 400, { error: error.message });
  }

  const validationError = validateTutorRequest(body, MAX_MESSAGE_CHARS);
  if (validationError) return jsonResponse(400, { error: validationError });

  const sessionId = request.headers.get('x-haneul-session');
  if (!sessionId || !/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) {
    return jsonResponse(400, {
      error: 'Identificador de sessão inválido. Recarregue a página e tente novamente.'
    });
  }
  if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
    return jsonResponse(503, {
      error: 'O tutor está ocupado no momento. Tente novamente em instantes.'
    });
  }

  const rateLimitResult = consumeRateLimits(context.ip || 'unknown', sessionId);
  if (rateLimitResult === 'session') {
    return jsonResponse(429, {
      error: 'Você atingiu o limite temporário de mensagens desta conversa. Tente novamente mais tarde.'
    });
  }
  if (rateLimitResult === 'ip') {
    return jsonResponse(429, {
      error: 'O limite temporário de uso foi atingido. Tente novamente mais tarde.'
    });
  }
  if (rateLimitResult === 'capacity') {
    return jsonResponse(503, {
      error: 'A proteção contra excesso de solicitações está temporariamente indisponível.'
    });
  }

  const modelMessages = body.messages.slice(-MAX_HISTORY_MESSAGES).map(({ role, content }) => ({
    role: role === 'assistant' ? 'model' : 'user',
    content
  }));
  if (body.startScenario) {
    modelMessages.push({
      role: 'user',
      content: `Comece agora a situação selecionada (${body.scenario}). Diga a primeira fala em coreano, com apoio em português proporcional ao nível, e faça uma pergunta por vez.`
    });
  }
  while (modelMessages.length && modelMessages[0].role !== 'user') modelMessages.shift();
  while (
    modelMessages.length > 1 &&
    modelMessages.reduce((sum, message) => sum + message.content.length, 0) > MAX_HISTORY_CHARS
  ) {
    modelMessages.splice(0, Math.min(2, modelMessages.length - 1));
  }
  if (
    modelMessages.reduce((sum, message) => sum + message.content.length, 0) > MAX_HISTORY_CHARS ||
    (!body.startScenario && modelMessages.length === 0)
  ) {
    return jsonResponse(400, {
      error: 'A conversa enviada ficou muito longa ou vazia. Inicie uma nova conversa para continuar.'
    });
  }

  concurrentRequests += 1;
  try {
    const reply = await generateTutorReply({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: buildTutorSystemInstruction(body, sanitizeUserContext(body.userContext)),
      messages: modelMessages,
      maxOutputTokens: MAX_RESPONSE_TOKENS
    });
    return jsonResponse(200, { reply });
  } catch (error) {
    if (error instanceof GeminiApiError) {
      if (error.status === 429) {
        return jsonResponse(429, {
          error: 'O limite de uso da Gemini API foi atingido. Tente mais tarde ou confira as cotas do seu projeto.'
        });
      }
      if (error.status === 401 || error.status === 403) {
        return jsonResponse(503, {
          error: 'A credencial da Gemini API não foi aceita. Revise as configurações privadas do servidor.'
        });
      }
      if (error.status === 400) {
        return jsonResponse(502, {
          error: 'A Gemini API rejeitou a solicitação. Confira o modelo configurado e tente novamente.'
        });
      }
      if (error.status >= 500) {
        return jsonResponse(502, {
          error: 'A Gemini API está temporariamente indisponível. Tente novamente em instantes.'
        });
      }
    }
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      return jsonResponse(504, { error: 'A Gemini API demorou para responder. Tente novamente.' });
    }
    if (error?.message === 'Invalid Gemini model configuration.') {
      return jsonResponse(503, { error: 'O modelo Gemini configurado no servidor é inválido.' });
    }
    console.error('Falha não detalhada na integração Gemini:', error?.name || 'Erro desconhecido');
    return jsonResponse(502, { error: 'Não foi possível obter uma resposta da IA. Tente novamente.' });
  } finally {
    concurrentRequests -= 1;
  }
}

export const config = {
  path: ['/api/health', '/api/chat']
};

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    const error = new Error('A solicitação excede o tamanho máximo permitido.');
    error.statusCode = 413;
    throw error;
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error('O corpo da solicitação está vazio.');

  const chunks = [];
  let size = 0;
  while (true) {
    let result;
    try {
      result = await reader.read();
    } catch {
      throw new Error('Não foi possível ler o corpo da solicitação.');
    }
    const { done, value } = result;
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      const error = new Error('A solicitação excede o tamanho máximo permitido.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('O corpo da solicitação não contém JSON válido.');
  }
}

function consumeRateLimits(ip, sessionId) {
  const now = Date.now();
  for (const [key, entry] of rateLimits) {
    if (entry.resetAt <= now) rateLimits.delete(key);
  }

  const secret = process.env.GEMINI_API_KEY;
  const ipKey = hashRateKey(secret, `ip:${ip}`);
  const sessionKey = hashRateKey(secret, `session:${ip}:${sessionId}`);
  const ipEntry = rateLimits.get(ipKey);
  const sessionEntry = rateLimits.get(sessionKey);
  if (ipEntry && ipEntry.count >= IP_HOURLY_LIMIT) return 'ip';
  if (sessionEntry && sessionEntry.count >= SESSION_HOURLY_LIMIT) return 'session';
  const newKeys = Number(!ipEntry) + Number(!sessionEntry);
  if (rateLimits.size + newKeys > MAX_RATE_LIMIT_KEYS) return 'capacity';

  incrementRateLimit(ipKey, ipEntry, now);
  incrementRateLimit(sessionKey, sessionEntry, now);
  return null;
}

function hashRateKey(secret, value) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

function incrementRateLimit(key, entry, now) {
  if (!entry || entry.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function isSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin === null) return true;
  if (origin === 'null') return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin && new URL(origin).origin === origin;
  } catch {
    return false;
  }
}

function jsonResponse(status, data, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...additionalHeaders
    }
  });
}

function readIntegerSetting(name, fallback, minimum, maximum) {
  const parsed = Number.parseInt(process.env[name] || String(fallback), 10);
  if (Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum) return parsed;
  if (process.env[name]) console.warn(`${name} fora do intervalo permitido; usando ${fallback}.`);
  return fallback;
}
