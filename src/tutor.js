const STORAGE = {
  messages: 'haneul.ai.messages',
  level: 'haneul.ai.level',
  mode: 'haneul.ai.mode',
  scenario: 'haneul.ai.scenario',
  difficulties: 'haneul.ai.difficulties',
  session: 'haneul.ai.session'
};

const MAX_STORED_MESSAGES = 40;
const MAX_SENT_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 2000;
const LESSON_TITLES = {
  'go-billy-korean-playlist': 'Go! Billy Korean — fundamentos e Hangul',
  'phrase-101': '101 frases essenciais',
  'seemile-playlist': 'Seemile Korean — fundamentos'
};

const elements = {
  status: document.querySelector('#tutor-status'),
  messages: document.querySelector('#chat-messages'),
  form: document.querySelector('#tutor-form'),
  input: document.querySelector('#tutor-message'),
  send: document.querySelector('#send-message'),
  level: document.querySelector('#tutor-level'),
  mode: document.querySelector('#tutor-mode'),
  scenario: document.querySelector('#tutor-scenario'),
  newChat: document.querySelector('#new-chat'),
  startScenario: document.querySelector('#start-scenario'),
  retry: document.querySelector('#tutor-retry')
};

let messages = sanitizeMessages(readSession(STORAGE.messages, []));
let storedDifficulties = readSession(STORAGE.difficulties, []);
let difficulties = Array.isArray(storedDifficulties)
  ? storedDifficulties.filter((item) => typeof item === 'string').slice(-10)
  : [];
let sessionId = readSession(STORAGE.session, '');
if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(sessionId)) {
  sessionId = createSessionId();
}
let busy = false;
let retryRequest = null;

elements.level.value = selectSessionValue(STORAGE.level, ['auto', 'absolute_beginner', 'basic', 'intermediate', 'advanced'], 'auto');
elements.mode.value = selectSessionValue(STORAGE.mode, ['teacher', 'conversation', 'correction', 'immersion', 'unlock'], 'teacher');
elements.scenario.value = selectSessionValue(STORAGE.scenario, ['free', 'meet', 'introduce', 'day', 'family', 'food_hobbies', 'friendship', 'directions', 'restaurant', 'messages', 'opinions'], 'free');
writeSession(STORAGE.session, sessionId);
clearLegacyPersistentChat();

elements.level.addEventListener('change', () => writeSession(STORAGE.level, elements.level.value));
elements.mode.addEventListener('change', () => writeSession(STORAGE.mode, elements.mode.value));
elements.scenario.addEventListener('change', () => writeSession(STORAGE.scenario, elements.scenario.value));
elements.form.addEventListener('submit', onSubmit);
elements.newChat.addEventListener('click', clearConversation);
elements.startScenario.addEventListener('click', startScenario);
elements.retry.addEventListener('click', () => {
  if (busy) return;
  if (!retryRequest) {
    void checkService();
    return;
  }
  const retry = retryRequest;
  retryRequest = null;
  elements.retry.classList.add('hidden');
  void sendToTutor(retry.content, retry.startScenario);
});
document.querySelectorAll('.prompt-suggestions [data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    elements.input.value = button.dataset.prompt;
    elements.input.focus();
  });
});

renderMessages();
checkService();

async function checkService() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('Não foi possível verificar o serviço.');
    const health = await response.json();
    setStatus(
      health.configured
        ? 'Configuração da Gemini detectada. A chave será validada quando você enviar a primeira mensagem.'
        : 'Configuração pendente: o backend está ativo, mas GEMINI_API_KEY ainda não foi definida no servidor.',
      health.configured ? 'ready' : 'error'
    );
  } catch {
    setStatus('Tutor indisponível. Inicie o site pelo servidor local com `npm start`; abrir index.html diretamente não conecta ao backend.', 'error', true);
  }
}

async function onSubmit(event) {
  event.preventDefault();
  const content = elements.input.value.trim();
  if (!content) {
    setStatus('Escreva uma mensagem antes de enviar.', 'error');
    elements.input.focus();
    return;
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    setStatus('A mensagem excede o limite de 2.000 caracteres.', 'error');
    return;
  }

  elements.input.value = '';
  await sendToTutor(content, false);
}

async function startScenario() {
  if (elements.scenario.value === 'free') {
    setStatus('Escolha uma situação específica ou use a conversa livre para enviar sua primeira mensagem.', 'error');
    elements.input.focus();
    return;
  }
  await sendToTutor(null, true);
}

async function sendToTutor(content, startScenarioRequest) {
  if (busy) return;
  retryRequest = null;
  elements.retry.classList.add('hidden');
  const priorMessages = [...messages];
  if (content) {
    messages = [...messages, { role: 'user', content, timestamp: Date.now() }];
    recordPotentialDifficulty(content);
    saveMessages();
    renderMessages();
  }

  busy = true;
  elements.send.disabled = true;
  elements.startScenario.disabled = true;
  addLoadingMessage();

  const requestMessages = (content ? messages : priorMessages)
    .slice(-MAX_SENT_MESSAGES)
    .map(({ role, content: messageContent }) => ({ role, content: messageContent }));

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Haneul-Session': sessionId
      },
      body: JSON.stringify({
        messages: requestMessages,
        mode: elements.mode.value,
        level: elements.level.value,
        scenario: elements.scenario.value,
        startScenario: startScenarioRequest,
        userContext: getLearningContext()
      })
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const fallback = response.status === 403 || response.status === 404
        ? 'O backend do Haneul AI não está acessível. Inicie o site com `npm start` e tente novamente.'
        : 'O tutor não conseguiu processar sua mensagem.';
      throw new Error(result.error || fallback);
    }
    if (typeof result.reply !== 'string' || !result.reply.trim()) {
      throw new Error('O tutor retornou uma resposta vazia. Tente novamente.');
    }

    messages = [...messages, { role: 'assistant', content: result.reply.trim(), timestamp: Date.now() }].slice(-MAX_STORED_MESSAGES);
    saveMessages();
    renderMessages();
    setStatus('Resposta recebida. Continue praticando uma frase de cada vez.', 'ready');
  } catch (error) {
    if (content) {
      messages = priorMessages;
      saveMessages();
      elements.input.value = content;
    }
    renderMessages();
    const message = error instanceof TypeError
      ? 'Falha de conexão com o tutor. Verifique se o backend está ativo e tente novamente.'
      : error.message || 'Falha de conexão com o tutor. Tente novamente.';
    setStatus(message, 'error', true);
    retryRequest = { content, startScenario: startScenarioRequest };
    elements.retry.classList.remove('hidden');
  } finally {
    busy = false;
    elements.send.disabled = false;
    elements.startScenario.disabled = false;
    elements.input.focus();
  }
}

function renderMessages() {
  elements.messages.replaceChildren();
  if (!messages.length) {
    const welcome = document.createElement('div');
    welcome.className = 'tutor-message';
    const text = document.createElement('p');
    text.className = 'tutor-message-content';
    text.textContent = '안녕하세요! Sou o Haneul AI. Podemos estudar gramática, corrigir uma frase ou praticar uma conversa. O que você gostaria de fazer?';
    welcome.append(text);
    elements.messages.append(welcome);
  }

  for (const message of messages) {
    const bubble = document.createElement('article');
    bubble.className = `tutor-message ${message.role}`;
    const text = document.createElement('p');
    text.className = 'tutor-message-content';
    text.textContent = message.content;
    bubble.append(text);

    if (message.role === 'assistant') {
      const actions = document.createElement('div');
      actions.className = 'tutor-message-actions';
      const copyButton = document.createElement('button');
      copyButton.type = 'button';
      copyButton.textContent = 'Copiar resposta';
      copyButton.addEventListener('click', () => copyText(message.content, copyButton));
      const reviewButton = document.createElement('button');
      reviewButton.type = 'button';
      reviewButton.textContent = 'Marcar para revisar';
      reviewButton.addEventListener('click', () => saveDifficulty(message.content, reviewButton));
      actions.append(copyButton, reviewButton);
      bubble.append(actions);
    }
    elements.messages.append(bubble);
  }
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function addLoadingMessage() {
  const bubble = document.createElement('div');
  bubble.className = 'tutor-message pending';
  bubble.id = 'tutor-loading';
  bubble.setAttribute('role', 'status');
  bubble.textContent = 'Haneul AI está preparando uma resposta…';
  elements.messages.append(bubble);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function setStatus(message, kind = '', showRetry = false) {
  elements.status.textContent = message;
  elements.status.append(document.createTextNode(' '), elements.retry);
  elements.status.className = `tutor-status ${kind}`.trim();
  elements.retry.classList.toggle('hidden', !showRetry);
}

function clearConversation() {
  if (messages.length && !window.confirm('Apagar o histórico desta conversa salvo neste navegador?')) return;
  messages = [];
  difficulties = [];
  retryRequest = null;
  writeSession(STORAGE.messages, messages);
  writeSession(STORAGE.difficulties, difficulties);
  renderMessages();
  setStatus('Nova conversa iniciada. O tutor não tem acesso ao histórico apagado.', 'ready');
}

function getLearningContext() {
  const completedIds = readStored('haneul.completedLessons', []);
  const favorites = readStored('haneul.favorites', []);
  const notebook = readStored('haneul.notebook', []);
  return {
    completedLessons: Array.isArray(completedIds)
      ? completedIds.slice(0, 5).map((id) => LESSON_TITLES[id] || String(id).slice(0, 100))
      : [],
    favorites: Array.isArray(favorites) ? favorites.slice(0, 5).map(String) : [],
    savedPhrases: Array.isArray(notebook)
      ? notebook.slice(0, 5).map((phrase) => `${String(phrase.hangul || '').slice(0, 50)} — ${String(phrase.translation || '').slice(0, 60)}`)
      : [],
    difficulties: difficulties.slice(-5)
  };
}

function recordPotentialDifficulty(content) {
  if (/(não sei|não entendi|travei|difícil|corrig|erro|틀렸|몰라)/i.test(content)) {
    const summary = content.replace(/\s+/g, ' ').slice(0, 100);
    difficulties = [...difficulties.filter((item) => item !== summary), summary].slice(-10);
    writeSession(STORAGE.difficulties, difficulties);
  }
}

function saveDifficulty(content, button) {
  const summary = content.replace(/\s+/g, ' ').slice(0, 100);
  difficulties = [...difficulties.filter((item) => item !== summary), summary].slice(-10);
  writeSession(STORAGE.difficulties, difficulties);
  button.textContent = 'Salvo para revisar';
  setStatus('Dificuldade registrada localmente. O tutor poderá usá-la como contexto nesta conversa.', 'ready');
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    button.textContent = 'Copiado';
    window.setTimeout(() => { button.textContent = 'Copiar resposta'; }, 1600);
  } catch {
    setStatus('Não foi possível copiar automaticamente neste navegador.', 'error');
  }
}

function saveMessages() {
  messages = messages.slice(-MAX_STORED_MESSAGES);
  writeSession(STORAGE.messages, messages);
}

function sanitizeMessages(value) {
  if (!Array.isArray(value)) return [];
  const clean = [];
  for (const entry of value.slice(-MAX_STORED_MESSAGES)) {
    if (
      !entry ||
      !['user', 'assistant'].includes(entry.role) ||
      typeof entry.content !== 'string' ||
      !entry.content.trim() ||
      entry.content.length > MAX_MESSAGE_LENGTH ||
      clean.at(-1)?.role === entry.role
    ) {
      continue;
    }
    clean.push({
      role: entry.role,
      content: entry.content,
      timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : Date.now()
    });
  }
  return clean;
}

function selectSessionValue(key, allowedValues, fallback) {
  const value = readSession(key, fallback);
  return allowedValues.includes(value) ? value : fallback;
}

function clearLegacyPersistentChat() {
  try {
    localStorage.removeItem(STORAGE.messages);
    localStorage.removeItem(STORAGE.difficulties);
  } catch (error) {
    console.error('Não foi possível remover o histórico antigo salvo localmente:', error);
  }
}

function readSession(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.error(`Não foi possível ler os dados da sessão ${key}:`, error);
    return fallback;
  }
}

function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Não foi possível salvar os dados da sessão ${key}:`, error);
    setStatus('O armazenamento da sessão falhou. Seu histórico pode não continuar disponível após recarregar a página.', 'error');
  }
}

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.error(`Não foi possível ler os dados locais de ${key}:`, error);
    return fallback;
  }
}

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll('-', '');
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}
