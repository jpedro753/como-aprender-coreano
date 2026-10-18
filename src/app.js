import {
  LEVELS,
  DAILY_PHRASES,
  VOCAB_FLASHCARDS,
  EXERCISES,
  PHRASE_NOTEBOOK,
  QUIZ_QUESTIONS,
  CONVERSATION_SCENARIOS,
  LESSONS
} from './data/lessons.js';

const STORAGE_KEYS = {
  completedLessons: 'haneul.completedLessons',
  favorites: 'haneul.favorites',
  quizScore: 'haneul.quizScore',
  lastLesson: 'haneul.lastLesson',
  notebook: 'haneul.notebook'
};

const state = {
  completedLessons: safeRead(STORAGE_KEYS.completedLessons, []),
  favorites: safeRead(STORAGE_KEYS.favorites, []),
  notebook: safeRead(STORAGE_KEYS.notebook, PHRASE_NOTEBOOK),
  currentVideo: LESSONS.find((lesson) => lesson.status === 'available') || LESSONS[0],
  quizState: {
    current: 0,
    selected: null,
    score: 0,
    finished: false,
    answers: []
  },
  exerciseState: {
    current: 0,
    selected: null,
    score: 0,
    finished: false
  },
  conversationIndex: 0,
  flashcardIndex: 0,
  dailyPhrase: DAILY_PHRASES[0]
};

const refs = {};

document.addEventListener('DOMContentLoaded', () => {
  bindRefs();
  renderQuiz();
  renderDashboard();
  renderLearningPath();
  renderVideoLibrary();
  renderConversationLab();
  renderFlashcards();
  renderExercises();
  renderNotebook();
  initPhraseAdd();
  renderRecentStudy();
  renderDailyPhrase();
});

function bindRefs() {
  refs.quizApp = document.querySelector('#quiz-app');
  refs.dashboard = document.querySelector('#student-dashboard');
  refs.learningPath = document.querySelector('#learning-path');
  refs.videoLibrary = document.querySelector('#video-library');
  refs.videoPlayerWrapper = document.querySelector('#video-player-wrapper');
  refs.conversationLab = document.querySelector('#conversation-lab');
  refs.flashcards = document.querySelector('#flashcards');
  refs.exercises = document.querySelector('#quiz-exercises');
  refs.notebook = document.querySelector('#phrase-notebook');
  refs.levelFilter = document.querySelector('#levelFilter');
  refs.categoryFilter = document.querySelector('#categoryFilter');
  refs.typeFilter = document.querySelector('#typeFilter');
  refs.videoSearch = document.querySelector('#videoSearch');

  refs.levelFilter.addEventListener('change', renderVideoLibrary);
  refs.categoryFilter.addEventListener('change', renderVideoLibrary);
  refs.typeFilter.addEventListener('change', renderVideoLibrary);
  refs.videoSearch.addEventListener('input', renderVideoLibrary);
}

function safeRead(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Erro ao persistir dados locais:', error);
  }
}

function getLessonProgress() {
  const total = LESSONS.length;
  const done = state.completedLessons.length;
  return Math.min(100, Math.round((done / total) * 100));
}

function getLevelStats() {
  return LEVELS.map((level) => {
    const levelLessons = LESSONS.filter((lesson) => Number(lesson.level) === Number(level.level));
    const completed = levelLessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
    const percentage = levelLessons.length ? Math.round((completed / levelLessons.length) * 100) : 0;
    return { ...level, completed, total: levelLessons.length, percentage };
  });
}

function renderQuiz() {
  const { current, selected, finished, score, answers } = state.quizState;
  const question = QUIZ_QUESTIONS[current];

  if (!question) {
    const perfectScore = score === QUIZ_QUESTIONS.length;
    refs.quizApp.innerHTML = `
      <div class="result-box">
        <p class="eyebrow">Resultado orientativo</p>
        <h3>${perfectScore ? 'Você já demonstra uma base sólida.' : 'Seu ponto de partida está em uma etapa construtiva.'}</h3>
        <p>Este teste ajuda a orientar a trilha, sem substituir uma avaliação oficial.</p>
        <ul>
          <li>Habilidades demonstradas: ${answers.map((item) => item).join(', ') || 'base em desenvolvimento'}</li>
          <li>Recomendação: comece pelo nível ${Math.min(2, Math.max(0, Math.round(score / 2)))} e avance com leitura, fala e prática.</li>
          <li>Você também pode escolher começar do zero mesmo que já conheça algo.</li>
        </ul>
        <div class="quiz-actions">
          <button class="button button-primary" type="button" data-action="restart-quiz">Refazer teste</button>
          <a href="#trilha" class="button button-secondary">Começar pelo meu nível</a>
        </div>
      </div>
    `;

    refs.quizApp.querySelector('[data-action="restart-quiz"]').addEventListener('click', () => {
      state.quizState = { current: 0, selected: null, score: 0, finished: false, answers: [] };
      renderQuiz();
    });
    return;
  }

  refs.quizApp.innerHTML = `
    <div class="quiz-card">
      <p class="eyebrow">Pergunta ${current + 1}/${QUIZ_QUESTIONS.length}</p>
      <h3>${question.prompt}</h3>
      <div class="quiz-options">
        ${question.options
          .map(
            (option) => `
              <button
                type="button"
                class="option-button ${selected === option ? 'selected' : ''}"
                data-option="${option}"
                data-question-id="${question.id}"
              >
                ${option}
              </button>
            `
          )
          .join('')}
      </div>
      <div class="quiz-actions">
        <button class="button button-primary" type="button" ${selected ? '' : 'disabled'} data-action="answer-question">Responder</button>
        <button class="button button-secondary" type="button" data-action="skip-question">Pular</button>
      </div>
    </div>
  `;

  refs.quizApp.querySelectorAll('.option-button').forEach((button) => {
    button.addEventListener('click', (event) => {
      state.quizState.selected = event.currentTarget.dataset.option;
      refs.quizApp.querySelectorAll('.option-button').forEach((btn) => btn.classList.toggle('selected', btn.dataset.option === state.quizState.selected));
      const answerButton = refs.quizApp.querySelector('[data-action="answer-question"]');
      answerButton.disabled = false;
    });
  });

  refs.quizApp.querySelector('[data-action="answer-question"]').addEventListener('click', () => {
    const chosen = state.quizState.selected;
    const isCorrect = chosen === question.correct;
    const nextScore = isCorrect ? score + 1 : score;
    const nextAnswers = [...answers, isCorrect ? question.category : 'prática contínua'];

    state.quizState.score = nextScore;
    state.quizState.answers = nextAnswers;
    state.quizState.current += 1;
    state.quizState.selected = null;

    renderQuiz();
  });

  refs.quizApp.querySelector('[data-action="skip-question"]').addEventListener('click', () => {
    state.quizState.current += 1;
    state.quizState.answers.push('pontos em revisão');
    renderQuiz();
  });
}

function renderDashboard() {
  const completedCount = state.completedLessons.length;
  const totalCount = LESSONS.length;
  const progress = Math.round((completedCount / totalCount) * 100);
  const average = getLevelStats();

  refs.dashboard.innerHTML = `
    <div class="panel-card">
      <div class="dashboard-row">
        <div>
          <p class="eyebrow">Olá, estudante</p>
          <h3>Seu progresso está em ${progress}%</h3>
        </div>
        <button class="button button-primary" type="button" data-action="continue-study">Continuar estudando</button>
      </div>
      <div class="panel-card" style="padding: 18px; margin-bottom: 18px; background: rgba(223,234,252,0.25);">
        <p class="eyebrow">Aula recomendada para hoje</p>
        <h3>${state.currentVideo ? state.currentVideo.title : 'Aula em preparação'}</h3>
        <p>${state.currentVideo ? state.currentVideo.description : 'Ainda não há vídeo marcado para esse módulo.'}</p>
      </div>
      <div class="progress-rings">
        ${average
          .slice(0, 4)
          .map(
            (level) => `
              <div class="progress-item">
                <strong>Nível ${level.level}</strong>
                <div class="progress-bar"><span style="width: ${level.percentage}%"></span></div>
                <small>${level.completed}/${level.total} aulas concluídas</small>
              </div>
            `
          )
          .join('')}
      </div>
    </div>

    <div class="panel-card">
      <p class="eyebrow">Resumo</p>
      <div class="progress-rings">
        <div class="progress-item">
          <strong>Aulas concluídas</strong>
          <div class="progress-bar"><span style="width: ${progress}%"></span></div>
          <small>${completedCount}/${totalCount}</small>
        </div>
        <div class="progress-item">
          <strong>Sequência</strong>
          <div class="progress-bar"><span style="width: ${Math.min(100, completedCount * 10)}%"></span></div>
          <small>${Math.max(1, Math.min(7, completedCount + 1))} dias estudados</small>
        </div>
      </div>
      <div class="progress-actions" style="margin-top: 18px;">
        <button type="button" class="button button-secondary" data-action="show-review">Revisões recomendadas</button>
        <button type="button" class="button button-secondary" data-action="show-favorites">Favoritos</button>
        <a class="button button-primary" href="#haneul-ai">Estudar com Haneul AI</a>
      </div>
    </div>
  `;

  refs.dashboard.querySelector('[data-action="continue-study"]').addEventListener('click', () => {
    if (state.currentVideo) {
      document.querySelector('#videos').scrollIntoView({ behavior: 'smooth' });
      renderVideoLibrary();
    }
  });

  refs.dashboard.querySelector('[data-action="show-review"]').addEventListener('click', () => {
    const reviewLesson = LESSONS.filter((lesson) => lesson.status === 'available').find((lesson) => !state.completedLessons.includes(lesson.id));
    if (reviewLesson) {
      state.currentVideo = reviewLesson;
      renderDashboard();
      renderVideoLibrary();
      document.querySelector('#videos').scrollIntoView({ behavior: 'smooth' });
    }
  });

  refs.dashboard.querySelector('[data-action="show-favorites"]').addEventListener('click', () => {
    const favoriteTitles = LESSONS.filter((lesson) => state.favorites.includes(lesson.id)).map((lesson) => lesson.title);
    alert(favoriteTitles.length ? `Favoritos: ${favoriteTitles.join(', ')}` : 'Você ainda não marcou nenhum favorito.');
  });
}

function renderLearningPath() {
  refs.learningPath.innerHTML = LEVELS.map((level) => {
    const levelLessons = LESSONS.filter((lesson) => Number(lesson.level) === Number(level.level));
    return `
      <article class="lesson-card">
        <div class="lesson-header">
          <div>
            <p class="eyebrow">${level.title}</p>
            <h3>${level.description}</h3>
          </div>
          <span class="lesson-module">${level.modules[0].title}</span>
        </div>
        <ul class="lesson-grid">
          <li>
            <strong>Módulos</strong>
            ${level.modules.map((module) => module.title).join(', ')}
          </li>
          <li>
            <strong>Objetivos</strong>
            ${level.modules[0].objectives.join(' • ')}
          </li>
          <li>
            <strong>Critério de conclusão</strong>
            ${level.modules[0].completion}
          </li>
        </ul>
      </article>
    `;
  }).join('');
}

function renderVideoLibrary() {
  const levelValue = refs.levelFilter.value;
  const categoryValue = refs.categoryFilter.value;
  const typeValue = refs.typeFilter.value;
  const searchValue = refs.videoSearch.value.trim().toLowerCase();
  const filtered = LESSONS.filter((lesson) => {
    const matchesLevel = levelValue === 'all' || Number(lesson.level) === Number(levelValue);
    const matchesCategory = categoryValue === 'all' || lesson.category === categoryValue;
    const matchesType = typeValue === 'all' || lesson.type === typeValue;
    const matchesSearch = !searchValue || lesson.title.toLowerCase().includes(searchValue) || lesson.description.toLowerCase().includes(searchValue) || lesson.category.toLowerCase().includes(searchValue);
    return matchesLevel && matchesCategory && matchesType && matchesSearch;
  });

  const categories = [...new Set(LESSONS.map((lesson) => lesson.category))].sort();
  refs.categoryFilter.innerHTML = `
    <option value="all">Todos os assuntos</option>
    ${categories.map((category) => `<option value="${category}">${category}</option>`).join('')}
  `;

  refs.categoryFilter.value = categoryValue || 'all';

  const mainLesson = filtered.find((lesson) => lesson.status === 'available') || filtered[0] || null;
  state.currentVideo = mainLesson || state.currentVideo;

  if (mainLesson && mainLesson.status === 'available') {
    refs.videoPlayerWrapper.innerHTML = `
      <div class="video-wrapper">
        <div class="video-frame">
          ${mainLesson.embedUrl
            ? `<iframe src="${mainLesson.embedUrl}" title="${mainLesson.title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
            : `<div style="display:grid;place-items:center;height:100%;padding:24px;color:var(--muted);">Vídeo indisponível. Use o link externo para abrir o conteúdo original.</div>`}
        </div>
        <div class="lesson-actions" style="margin-top: 16px;">
          ${mainLesson.url ? `<a class="button button-primary" href="${mainLesson.url}" target="_blank" rel="noreferrer noopener">Abrir no YouTube</a>` : ''}
          <button class="button button-secondary" type="button" data-action="toggle-complete" data-id="${mainLesson.id}">${state.completedLessons.includes(mainLesson.id) ? 'Marcar como não concluída' : 'Marcar como concluída'}</button>
        </div>
      </div>
    `;

    refs.videoPlayerWrapper.querySelector('[data-action="toggle-complete"]').addEventListener('click', () => toggleLessonComplete(mainLesson.id));
  } else {
    refs.videoPlayerWrapper.innerHTML = `
      <div class="video-wrapper" style="padding: 24px;">
        <p class="eyebrow">Aula em preparação</p>
        <h3>Nenhuma aula disponível nesta seleção.</h3>
        <p>Os slots futuros ficam prontos para receber novos links e materiais.</p>
      </div>
    `;
  }

  refs.videoLibrary.innerHTML = filtered.length
    ? filtered
        .map((lesson) => {
          const favorite = state.favorites.includes(lesson.id);
          const complete = state.completedLessons.includes(lesson.id);
          const isPending = lesson.type === 'pending';
          return `
            <article class="video-card">
              <div class="video-meta">
                <span class="badge ${lesson.type === 'pending' ? 'pending' : lesson.type === 'external' ? 'external' : ''}">${lesson.type === 'pending' ? 'Aula em preparação' : lesson.type === 'external' ? 'Externo' : lesson.type === 'playlist' ? 'Playlist' : 'Vídeo'}</span>
                <span class="badge">Nível ${lesson.level}</span>
              </div>
              <div>
                <h3>${lesson.title}</h3>
                <p>${lesson.description}</p>
              </div>
              <div class="video-meta">
                <span class="badge">${lesson.category}</span>
                <span class="badge">${lesson.module}</span>
              </div>
              <div class="card-actions">
                ${lesson.status === 'available' ? `<button class="button button-primary" type="button" data-action="play-lesson" data-id="${lesson.id}">Assistir aula</button>` : `<button class="button button-ghost" type="button" disabled>Aula em preparação</button>`}
                ${lesson.url ? `<a class="button button-ghost" href="${lesson.url}" target="_blank" rel="noreferrer noopener">Abrir URL</a>` : ''}
                ${lesson.status === 'available' ? `<button class="button ${complete ? 'button-ghost success' : 'button-ghost'}" type="button" data-action="toggle-complete" data-id="${lesson.id}">${complete ? 'Concluída' : 'Concluir'}</button>` : ''}
                <button class="favorite-btn ${favorite ? 'active' : ''}" type="button" data-action="toggle-favorite" data-id="${lesson.id}" aria-label="Favoritar aula">★</button>
              </div>
            </article>
          `;
        })
        .join('')
    : '<div class="video-wrapper" style="padding: 24px;"><p>Nenhum vídeo encontrado para os filtros atuais.</p></div>';

  refs.videoLibrary.querySelectorAll('[data-action="play-lesson"]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = LESSONS.find((lesson) => lesson.id === button.dataset.id);
      state.currentVideo = item || state.currentVideo;
      renderVideoLibrary();
    });
  });

  refs.videoLibrary.querySelectorAll('[data-action="toggle-complete"]').forEach((button) => {
    button.addEventListener('click', () => toggleLessonComplete(button.dataset.id));
  });

  refs.videoLibrary.querySelectorAll('[data-action="toggle-favorite"]').forEach((button) => {
    button.addEventListener('click', () => toggleFavorite(button.dataset.id));
  });
}

function renderConversationLab() {
  const current = CONVERSATION_SCENARIOS[state.conversationIndex];
  if (!current) {
    refs.conversationLab.innerHTML = '<div class="dialogue-card"><p>Você concluiu as simulações disponíveis.</p></div>';
    return;
  }

  refs.conversationLab.innerHTML = `
    <div class="dialogue-card">
      <span class="context-pill">${current.context}</span>
      <p class="eyebrow">Objetivo comunicativo</p>
      <h3>${current.goal}</h3>
      <div class="prompt-block">
        <strong>Frase em coreano</strong>
        <p>${current.prompt}</p>
      </div>
      <div class="conversation-actions">
        <button class="button button-secondary" type="button" data-action="reveal-hint">Revelar dica</button>
        <button class="button button-secondary" type="button" data-action="reveal-answer">Revelar resposta</button>
        <button class="button button-primary" type="button" data-action="next-scenario">Próxima pergunta</button>
      </div>
      <div class="hint-box hidden" data-role="hint">${current.hint}</div>
      <div class="answer-box hidden" data-role="answer">
        <p><strong>Resposta de exemplo:</strong> ${current.answer}</p>
        <p class="lang-example">Tradução: ${current.translation}</p>
        <p class="lang-example">Continuação: ${current.next}</p>
      </div>
    </div>
  `;

  refs.conversationLab.querySelector('[data-action="reveal-hint"]').addEventListener('click', () => {
    refs.conversationLab.querySelector('[data-role="hint"]').classList.toggle('hidden');
  });

  refs.conversationLab.querySelector('[data-action="reveal-answer"]').addEventListener('click', () => {
    refs.conversationLab.querySelector('[data-role="answer"]').classList.toggle('hidden');
  });

  refs.conversationLab.querySelector('[data-action="next-scenario"]').addEventListener('click', () => {
    state.conversationIndex = (state.conversationIndex + 1) % CONVERSATION_SCENARIOS.length;
    renderConversationLab();
  });
}

function renderFlashcards() {
  refs.flashcards.innerHTML = VOCAB_FLASHCARDS.map((item) => {
    const active = state.favorites.includes(item.id);
    return `
      <article class="flashcard">
        <div class="flashcard-head">
          <div>
            <div class="hangul">${item.word}</div>
            <div class="translation">${item.translation}</div>
          </div>
          <button class="favorite-btn ${active ? 'active' : ''}" type="button" data-action="favorite-word" data-id="${item.id}">★</button>
        </div>
        <p>${item.example}</p>
      </article>
    `;
  }).join('');

  refs.flashcards.querySelectorAll('[data-action="favorite-word"]').forEach((button) => {
    button.addEventListener('click', () => toggleFavorite(button.dataset.id));
  });
}

function renderExercises() {
  const item = EXERCISES[state.exerciseState.current];
  if (!item) {
    refs.exercises.innerHTML = '<div class="exercise-item"><h4>Você concluiu os exercícios disponíveis.</h4><p>Volte para revisar as frases e tentar outra rodada.</p></div>';
    return;
  }

  refs.exercises.innerHTML = `
    <div class="exercise-item">
      <header>
        <h4>${item.question}</h4>
      </header>
      <div class="quiz-options">
        ${item.options.map((option) => `
          <button class="option-button ${state.exerciseState.selected === option ? 'selected' : ''}" type="button" data-option="${option}">${option}</button>
        `).join('')}
      </div>
      <div class="quiz-actions">
        <button class="button button-primary" type="button" data-action="submit-exercise">Responder</button>
        <button class="button button-secondary" type="button" data-action="next-exercise">Próxima</button>
      </div>
    </div>
  `;

  refs.exercises.querySelectorAll('[data-option]').forEach((button) => {
    button.addEventListener('click', () => {
      state.exerciseState.selected = button.dataset.option;
      refs.exercises.querySelectorAll('[data-option]').forEach((btn) => btn.classList.toggle('selected', btn.dataset.option === state.exerciseState.selected));
    });
  });

  refs.exercises.querySelector('[data-action="submit-exercise"]').addEventListener('click', () => {
    const selected = state.exerciseState.selected;
    const isCorrect = selected === item.answer;
    const explanation = isCorrect ? 'Correto! ' + item.explanation : 'Resposta certa: ' + item.answer + '. ' + item.explanation;
    refs.exercises.innerHTML = `
      <div class="exercise-item">
        <header><h4>${item.question}</h4></header>
        <p>${explanation}</p>
        <div class="quiz-actions">
          <button class="button button-primary" type="button" data-action="next-exercise">Continuar</button>
        </div>
      </div>
    `;
    refs.exercises.querySelector('[data-action="next-exercise"]').addEventListener('click', () => {
      state.exerciseState.current = (state.exerciseState.current + 1) % EXERCISES.length;
      state.exerciseState.selected = null;
      renderExercises();
    });
  });

  refs.exercises.querySelector('[data-action="next-exercise"]').addEventListener('click', () => {
    state.exerciseState.current = (state.exerciseState.current + 1) % EXERCISES.length;
    state.exerciseState.selected = null;
    renderExercises();
  });
}

function renderNotebook() {
  refs.notebook.innerHTML = state.notebook.map((phrase) => `
    <div class="notebook-item">
      <div class="notebook-head">
        <strong>${phrase.hangul}</strong>
        <button class="toggle-btn" type="button" data-action="remove-phrase" data-id="${phrase.id}">Remover</button>
      </div>
      <em>${phrase.translation}</em>
      <p>${phrase.category}</p>
    </div>
  `).join('');

  refs.notebook.querySelectorAll('[data-action="remove-phrase"]').forEach((button) => {
    button.addEventListener('click', () => {
      state.notebook = state.notebook.filter((phrase) => phrase.id !== button.dataset.id);
      safeWrite(STORAGE_KEYS.notebook, state.notebook);
      renderNotebook();
    });
  });
}

function renderRecentStudy() {
  const lastLessonId = safeRead(STORAGE_KEYS.lastLesson, null);
  const lastLesson = lastLessonId ? LESSONS.find((lesson) => lesson.id === lastLessonId) : null;
  if (lastLesson) {
    const recent = document.createElement('div');
    recent.className = 'result-box';
    recent.innerHTML = `
      <p class="eyebrow">Último conteúdo estudado</p>
      <h3>${lastLesson.title}</h3>
      <p>${lastLesson.description}</p>
    `;
    document.querySelector('#videos').appendChild(recent);
  }
}

function renderDailyPhrase() {
  const daily = DAILY_PHRASES[Math.floor(Math.random() * DAILY_PHRASES.length)];
  state.dailyPhrase = daily;
  const target = document.querySelector('#student-dashboard');
  if (!target) return;
  const dailyCard = document.createElement('div');
  dailyCard.className = 'panel-card';
  dailyCard.innerHTML = `
    <p class="eyebrow">Frase coreana do dia</p>
    <h3>${daily.hangul}</h3>
    <p>Tradução: ${daily.meaning}</p>
    <p>Romanização: ${daily.romanization}</p>
  `;
  target.appendChild(dailyCard);
}

function toggleLessonComplete(id) {
  const exists = state.completedLessons.includes(id);
  if (exists) {
    state.completedLessons = state.completedLessons.filter((item) => item !== id);
  } else {
    state.completedLessons = [...state.completedLessons, id];
  }
  safeWrite(STORAGE_KEYS.completedLessons, state.completedLessons);
  safeWrite(STORAGE_KEYS.lastLesson, id);
  renderDashboard();
  renderVideoLibrary();
}

function toggleFavorite(id) {
  const exists = state.favorites.includes(id);
  state.favorites = exists ? state.favorites.filter((item) => item !== id) : [...state.favorites, id];
  safeWrite(STORAGE_KEYS.favorites, state.favorites);
  renderFlashcards();
  renderVideoLibrary();
}

export function quickAddPhrase(phrase) {
  const newPhrase = {
    id: `p-${Date.now()}`,
    ...phrase
  };
  state.notebook = [newPhrase, ...state.notebook];
  safeWrite(STORAGE_KEYS.notebook, state.notebook);
  renderNotebook();
}

function initPhraseAdd() {
  const notebookArea = refs.notebook;
  const newPhraseButton = document.createElement('button');
  newPhraseButton.type = 'button';
  newPhraseButton.className = 'button button-primary';
  newPhraseButton.textContent = 'Salvar frase de exemplo';
  newPhraseButton.addEventListener('click', () => {
    quickAddPhrase({
      hangul: '아직 잘 모르겠어요.',
      translation: 'Ainda não entendi bem.',
      category: 'Dica de conversa'
    });
  });
  notebookArea.appendChild(newPhraseButton);
}
