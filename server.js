import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateTutorReply, buildTutorSystemInstruction } from './src/services/gemini.js';
import { validateTutorRequest, sanitizeUserContext } from './src/services/tutor-request.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
await loadEnvironmentFile();

const PORT = readIntegerSetting('PORT', 3000, 1, 65535);
const MAX_BODY_BYTES = 32 * 1024;
const MAX_MESSAGE_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 12000;
const MAX_RATE_LIMIT_KEYS = 10000;
const SESSION_HOURLY_LIMIT = readIntegerSetting('HANEUL_SESSION_HOURLY_LIMIT', 20, 1, 200);
const IP_HOURLY_LIMIT = readIntegerSetting('HANEUL_IP_HOURLY_LIMIT', 60, 1, 500);
const MAX_RESPONSE_TOKENS = readIntegerSetting('HANEUL_MAX_RESPONSE_TOKENS', 600, 64, 1200);
const WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_FILE = resolve(ROOT, process.env.HANEUL_RATE_LIMIT_FILE || '.haneul-rate-limits.json');
const ALLOWED_ORIGINS = new Set(
  (process.env.HANEUL_ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin)
);
const PUBLIC_FILES = new Map([
  ['/index.html', 'index.html'],
  ['/src/app.js', 'src/app.js'],
  ['/src/tutor.js', 'src/tutor.js'],
  ['/src/styles.css', 'src/styles.css'],
  ['/src/data/lessons.js', 'src/data/lessons.js']
]);

const rateLimitState = await loadRateLimitState();
let rateLimitQueue = Promise.resolve();
let concurrentRequests = 0;
const MAX_CONCURRENT_REQUESTS = readIntegerSetting('HANEUL_MAX_CONCURRENT_REQUESTS', 4, 1, 20);

const server = createServer(async (request, response) => {
  setSecurityHeaders(response);

  const pathname = new URL(request.url || '/', 'http://localhost').pathname;
  if (pathname.startsWith('/api/')) {
    const originResult = checkRequestOrigin(request);
    if (!originResult.allowed) {
      return sendJson(response, 403, { error: 'Origem não autorizada.' });
    }

    if (request.method === 'OPTIONS') {
      return handlePreflight(request, response, originResult.allowedOrigin);
    }

    if (request.method === 'GET' && pathname === '/api/health') {
      return sendJson(response, 200, {
        configured: Boolean(process.env.GEMINI_API_KEY),
        provider: 'Gemini'
      }, originResult.allowedOrigin);
    }

    if (pathname === '/api/chat') {
      if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST, OPTIONS');
        return sendJson(response, 405, { error: 'Método não permitido.' }, originResult.allowedOrigin);
      }
      return handleChat(request, response, originResult.allowedOrigin);
    }

    return sendJson(response, 404, { error: 'Endpoint não encontrado.' }, originResult.allowedOrigin);
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return sendJson(response, 405, { error: 'Método não permitido.' });
  }

  return serveStatic(pathname, request.method === 'HEAD', response);
});

server.headersTimeout = 10000;
server.requestTimeout = 15000;
server.keepAliveTimeout = 5000;

server.listen(PORT, () => {
  console.log(`Haneul disponível em http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY não configurada; o tutor mostrará a configuração pendente.');
  }
});

async function handleChat(request, response, allowedOrigin) {
  if (!process.env.GEMINI_API_KEY) {
    return sendJson(response, 503, {
      error: 'O tutor de IA ainda não está configurado. Defina GEMINI_API_KEY no ambiente privado do servidor.'
    }, allowedOrigin);
  }

  if (!isJsonRequest(request)) {
    return sendJson(response, 415, { error: 'Envie a solicitação como application/json.' }, allowedOrigin);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return sendJson(response, error.statusCode || 400, { error: error.message }, allowedOrigin);
  }

  const validationError = validateTutorRequest(body, MAX_MESSAGE_CHARS);
  if (validationError) {
    return sendJson(response, 400, { error: validationError }, allowedOrigin);
  }

  if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
    return sendJson(response, 503, { error: 'O tutor está ocupado no momento. Tente novamente em instantes.' }, allowedOrigin);
  }
  concurrentRequests += 1;
  try {

  const sessionId = request.headers['x-haneul-session'];
  if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) {
    return sendJson(response, 400, { error: 'Identificador de sessão inválido. Recarregue a página e tente novamente.' }, allowedOrigin);
  }

  const ip = request.socket.remoteAddress || 'unknown';
  let rateLimitResult;
  try {
    rateLimitResult = await consumeRateLimits(ip, sessionId);
  } catch {
    console.error('Persistência do rate limit indisponível; rejeitando solicitação.');
    return sendJson(response, 503, { error: 'A proteção contra excesso de solicitações está temporariamente indisponível.' }, allowedOrigin);
  }

  if (rateLimitResult === 'session') {
    return sendJson(response, 429, { error: 'Você atingiu o limite temporário de mensagens desta conversa. Tente novamente mais tarde.' }, allowedOrigin);
  }
  if (rateLimitResult === 'ip') {
    return sendJson(response, 429, { error: 'O limite temporário de uso foi atingido. Tente novamente mais tarde.' }, allowedOrigin);
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
  while (modelMessages.length && modelMessages[0].role !== 'user') {
    modelMessages.shift();
  }
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
    return sendJson(response, 400, { error: 'A conversa enviada ficou muito longa ou vazia. Inicie uma nova conversa para continuar.' }, allowedOrigin);
  }

  try {
    const reply = await generateTutorReply({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: buildTutorSystemInstruction(body, sanitizeUserContext(body.userContext)),
      messages: modelMessages,
      maxOutputTokens: MAX_RESPONSE_TOKENS
    });
    return sendJson(response, 200, { reply }, allowedOrigin);
  } catch (error) {
    if (error.name === 'GeminiApiError') {
      if (error.status === 429) {
        return sendJson(response, 429, { error: 'O limite de uso da Gemini API foi atingido. Tente mais tarde ou confira as cotas do seu projeto.' }, allowedOrigin);
      }
      if (error.status === 401 || error.status === 403) {
        return sendJson(response, 503, { error: 'A credencial da Gemini API não foi aceita. Revise as configurações privadas do servidor.' }, allowedOrigin);
      }
      if (error.status === 400) {
        return sendJson(response, 502, { error: 'A Gemini API rejeitou a solicitação. Confira o modelo configurado e tente novamente.' }, allowedOrigin);
      }
      if (error.status >= 500) {
        return sendJson(response, 502, { error: 'A Gemini API está temporariamente indisponível. Tente novamente em instantes.' }, allowedOrigin);
      }
    }
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return sendJson(response, 504, { error: 'A Gemini API demorou para responder. Tente novamente.' }, allowedOrigin);
    }
    console.error('Falha não detalhada na integração Gemini:', error.name || 'Erro desconhecido');
    return sendJson(response, 502, { error: 'Não foi possível obter uma resposta da IA. Tente novamente.' }, allowedOrigin);
  }
  } finally {
    concurrentRequests -= 1;
  }
}

function checkRequestOrigin(request) {
  const origin = request.headers.origin;
  if (origin === undefined) return { allowed: true, allowedOrigin: null };
  if (typeof origin !== 'string' || origin === 'null') return { allowed: false, allowedOrigin: null };

  let parsedOrigin;
  try {
    parsedOrigin = new URL(origin);
  } catch {
    return { allowed: false, allowedOrigin: null };
  }
  if (parsedOrigin.origin !== origin) return { allowed: false, allowedOrigin: null };
  if (ALLOWED_ORIGINS.has(parsedOrigin.origin)) {
    return { allowed: true, allowedOrigin: parsedOrigin.origin };
  }
  if (parsedOrigin.host === request.headers.host) {
    return { allowed: true, allowedOrigin: null };
  }
  return { allowed: false, allowedOrigin: null };
}

function handlePreflight(request, response, allowedOrigin) {
  const requestedMethod = request.headers['access-control-request-method'];
  const requestedHeaders = (request.headers['access-control-request-headers'] || '')
    .split(',')
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean);
  if (
    requestedMethod !== 'POST' ||
    requestedHeaders.some((header) => !['content-type', 'x-haneul-session'].includes(header))
  ) {
    return sendJson(response, 403, { error: 'Preflight CORS não autorizado.' }, allowedOrigin);
  }
  response.writeHead(204, {
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Haneul-Session',
    'Access-Control-Max-Age': '600'
  });
  response.end();
}

function isJsonRequest(request) {
  const contentType = request.headers['content-type'];
  return typeof contentType === 'string' && /^application\/json(?:\s*;|$)/i.test(contentType);
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers['content-length']);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    const error = new Error('A solicitação excede o tamanho máximo permitido.');
    error.statusCode = 413;
    throw error;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('A solicitação excede o tamanho máximo permitido.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('O corpo da solicitação não contém JSON válido.');
  }
}

async function loadRateLimitState() {
  try {
    const contents = await readFile(RATE_LIMIT_FILE, 'utf8');
    const data = JSON.parse(contents);
    if (
      !data ||
      typeof data !== 'object' ||
      typeof data.salt !== 'string' ||
      !/^[a-f0-9]{64}$/.test(data.salt) ||
      !data.entries ||
      typeof data.entries !== 'object' ||
      Array.isArray(data.entries)
    ) {
      throw new Error('Invalid rate limit data');
    }
    const entries = new Map(Object.entries(data.entries));
    if (entries.size > MAX_RATE_LIMIT_KEYS) throw new Error('Rate limit data exceeds capacity.');
    for (const [key, entry] of entries) {
      if (
        !/^[a-f0-9]{64}$/.test(key) ||
        !entry ||
        !Number.isInteger(entry.count) ||
        entry.count < 1 ||
        !Number.isFinite(entry.resetAt)
      ) {
        throw new Error('Invalid rate limit entry.');
      }
    }
    return { salt: data.salt, entries };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { salt: randomBytes(32).toString('hex'), entries: new Map() };
    }
    console.error('Estado de rate limit inválido ou ilegível; servidor encerrado para não falhar aberto.');
    throw new Error('Persistent rate-limit storage could not be loaded.');
  }
}

function consumeRateLimits(ip, sessionId) {
  const operation = rateLimitQueue.then(async () => {
    const now = Date.now();
    pruneRateLimitEntries(now);
    const ipKey = hashRateKey(`ip:${ip}`);
    const sessionKey = hashRateKey(`session:${ip}:${sessionId}`);
    const ipEntry = rateLimitState.entries.get(ipKey);
    const sessionEntry = rateLimitState.entries.get(sessionKey);
    if (ipEntry && ipEntry.count >= IP_HOURLY_LIMIT) return 'ip';
    if (sessionEntry && sessionEntry.count >= SESSION_HOURLY_LIMIT) return 'session';
    const newEntries = Number(!ipEntry) + Number(!sessionEntry);
    if (rateLimitState.entries.size + newEntries > MAX_RATE_LIMIT_KEYS) {
      throw new Error('Rate limit storage capacity reached.');
    }
    incrementRateLimitEntry(ipKey, ipEntry, now);
    incrementRateLimitEntry(sessionKey, sessionEntry, now);
    await persistRateLimitState();
    return null;
  });
  rateLimitQueue = operation.catch(() => {});
  return operation;
}

function hashRateKey(value) {
  return createHash('sha256').update(`${rateLimitState.salt}:${value}`).digest('hex');
}

function incrementRateLimitEntry(key, entry, now) {
  if (!entry || entry.resetAt <= now) {
    rateLimitState.entries.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  entry.count += 1;
}

function pruneRateLimitEntries(now) {
  for (const [key, entry] of rateLimitState.entries) {
    if (!entry || !Number.isFinite(entry.resetAt) || entry.resetAt <= now) {
      rateLimitState.entries.delete(key);
    }
  }
}

async function persistRateLimitState() {
  const temporaryPath = `${RATE_LIMIT_FILE}.${process.pid}.tmp`;
  await mkdir(dirname(RATE_LIMIT_FILE), { recursive: true });
  await writeFile(temporaryPath, JSON.stringify({
    salt: rateLimitState.salt,
    entries: Object.fromEntries(rateLimitState.entries)
  }), { mode: 0o600 });
  await rename(temporaryPath, RATE_LIMIT_FILE);
}

async function serveStatic(pathname, headOnly, response) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return sendJson(response, 400, { error: 'Caminho inválido.' });
  }
  const fileName = PUBLIC_FILES.get(decodedPath);
  if (!fileName) {
    return sendJson(response, 404, { error: 'Arquivo não encontrado.' });
  }

  try {
    const content = await readFile(resolve(ROOT, fileName));
    response.writeHead(200, {
      'Content-Type': contentType(extname(fileName)),
      'Content-Length': content.length,
      'Cache-Control': 'no-cache'
    });
    response.end(headOnly ? undefined : content);
  } catch (error) {
    console.error('Falha ao servir recurso público:', error.code || 'erro de leitura');
    return sendJson(response, 500, { error: 'Não foi possível abrir o recurso solicitado.' });
  }
}

function contentType(extension) {
  return ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8'
  })[extension] || 'application/octet-stream';
}

function sendJson(response, statusCode, data, allowedOrigin = null) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...(allowedOrigin ? { 'Access-Control-Allow-Origin': allowedOrigin, Vary: 'Origin' } : {})
  });
  response.end(JSON.stringify(data));
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://i.ytimg.com; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
}

async function loadEnvironmentFile() {
  const envFile = resolve(ROOT, '.env');
  let contents;
  try {
    contents = await readFile(envFile, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return;
    console.error('Não foi possível ler a configuração de ambiente local.');
    return;
  }
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (!process.env[key]) process.env[key] = value;
  }
}

function readIntegerSetting(name, fallback, minimum, maximum) {
  const parsed = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    console.warn(`${name} fora do intervalo permitido; usando ${fallback}.`);
    return fallback;
  }
  return parsed;
}
