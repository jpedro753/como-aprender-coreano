export const LEVELS = [
  {
    level: 0,
    title: 'Nível 0 — Recomeçando do jeito certo',
    description: 'Diagnóstico, Hangul, sons básicos e leitura inicial.',
    modules: [
      {
        title: 'Diagnóstico e fundamentos',
        objectives: ['Identificar o ponto de partida', 'Revisar Hangul', 'Reconhecer blocos silábicos'],
        lessons: ['Hangul em foco', 'Vogais e consoantes', 'Leitura de palavras curtas'],
        completion: 'Observar leitura e sons básicos com atenção.'
      }
    ]
  },
  {
    level: 1,
    title: 'Nível 1 — Primeiras conversas',
    description: 'Cumprimentos, apresentação pessoal e estrutura básica da frase.',
    modules: [
      {
        title: 'Introdução social',
        objectives: ['Cumprimentar e apresentar-se', 'Usar partículas básicas', 'Falar em frases simples'],
        lessons: ['Saudações', 'Apresentação pessoal', 'Perguntas básicas'],
        completion: 'Construir diálogos curtos com segurança.'
      }
    ]
  },
  {
    level: 2,
    title: 'Nível 2 — Construindo frases',
    description: 'Presente, passado e futuro com conectores e opiniões.',
    modules: [
      {
        title: 'Estrutura e tempo verbal',
        objectives: ['Formar frases corretas', 'Usar passado e futuro', 'Explicar motivos'],
        lessons: ['Tempo verbal', 'Partículas de tópico e objeto', 'Desejos e preferências'],
        completion: 'Responder com frases completas em vez de palavras soltas.'
      }
    ]
  },
  {
    level: 3,
    title: 'Nível 3 — Conversação do dia a dia',
    description: 'Rotina, família, trabalho, compras e conversas práticas.',
    modules: [
      {
        title: 'Situações cotidianas',
        objectives: ['Falar sobre rotina', 'Conversar em restaurantes e lojas', 'Fazer convites'],
        lessons: ['Família e rotina', 'Pedido de informações', 'Convites e recusa educada'],
        completion: 'Lidar com interações do cotidiano com mais autonomia.'
      }
    ]
  },
  {
    level: 4,
    title: 'Nível 4 — Coreano natural',
    description: 'Escuta mais rápida, expressões espontâneas e linguagem coloquial.',
    modules: [
      {
        title: 'Naturalidade e contexto',
        objectives: ['Entender fala mais veloz', 'Usar contrações', 'Manter conversa espontânea'],
        lessons: ['Expressões comuns', 'Reações e interjeições', 'Contar histórias'],
        completion: 'Responder de forma natural sem traduzir palavra por palavra.'
      }
    ]
  },
  {
    level: 5,
    title: 'Nível 5 — Conversação avançada',
    description: 'Discussão complexa, nuance, humor e manutenção de conversa.',
    modules: [
      {
        title: 'Conversas abstratas e sociais',
        objectives: ['Argumentar com clareza', 'Usar registros apropriados', 'Entender contexto autêntico'],
        lessons: ['Discussões e opinião', 'Pragmatismo e nuances', 'Manutenção da conversa'],
        completion: 'Sustentar conversa longa e adaptar registro a diferentes interlocutores.'
      }
    ]
  }
];

export const DAILY_PHRASES = [
  { hangul: '좋은 하루 되세요.', romanization: 'Jo-eun haru doeseyo.', meaning: 'Tenha um bom dia.' },
  { hangul: '오늘은 뭘 했어요?', romanization: 'Oneureun mwo haesseoyo?', meaning: 'O que você fez hoje?' },
  { hangul: '한국어로 어떻게 말해요?', romanization: 'Hangukeoro eotteoke malhaeyo?', meaning: 'Como se diz isso em coreano?' },
  { hangul: '조금 천천히 말해 주세요.', romanization: 'Jogeum cheoncheonhi malhae juseyo.', meaning: 'Por favor, fale um pouco mais devagar.' }
];

export const VOCAB_FLASHCARDS = [
  { id: 'korean-01', word: '안녕하세요', translation: 'Olá / Boa tarde', example: '안녕하세요, 만나서 반가워요.', favorite: false },
  { id: 'korean-02', word: '이름', translation: 'nome', example: '제 이름은 마리아예요.', favorite: true },
  { id: 'korean-03', word: '좋다', translation: 'ser bom / gostar', example: '이 음식이 좋아요.', favorite: false },
  { id: 'korean-04', word: '배우다', translation: 'aprender', example: '한국어를 배우고 있어요.', favorite: false },
  { id: 'korean-05', word: '천천히', translation: 'devagar', example: '천천히 말해 주세요.', favorite: false }
];

export const EXERCISES = [
  {
    id: 'ex-1',
    question: 'Qual é a tradução mais natural de “제 이름은 마리아예요”?',
    options: ['Meu nome é Maria.', 'Eu gosto de Maria.', 'Maria é minha comida.', 'Eu estou em Maria.'],
    answer: 'Meu nome é Maria.',
    explanation: 'A estrutura “제 이름은 …예요” indica “Meu nome é …”.'
  },
  {
    id: 'ex-2',
    question: 'Complete: “한국어를 ____ 있어요.”',
    options: ['배우고', '먹고', '자고', '가고'],
    answer: '배우고',
    explanation: '“배우다” significa aprender. A forma contínua “배우고” é usada para “estou aprendendo”.'
  },
  {
    id: 'ex-3',
    question: 'Qual frase poderia responder melhor à pergunta “어디에서 왔어요?”',
    options: ['브라질에서 왔어요.', '좋아요.', '아침에 왔어요.', '한국어를 공부해요.'],
    answer: '브라질에서 왔어요.',
    explanation: 'A pergunta pede origem. A resposta natural indica o local de origem.'
  }
];

export const PHRASE_NOTEBOOK = [
  { id: 'phrase-1', hangul: '한국어로 어떻게 말해요?', translation: 'Como se diz isso em coreano?', category: 'Conversação' },
  { id: 'phrase-2', hangul: '저는 학생이에요.', translation: 'Eu sou estudante.', category: 'Apresentação' },
  { id: 'phrase-3', hangul: '오늘 날씨가 좋아요.', translation: 'O clima está bom hoje.', category: 'Dia a dia' }
];

export const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    category: 'hangul',
    prompt: 'Qual das opções contém uma vogal do Hangul?',
    options: ['ㄱ', 'ㅏ', 'ㄷ', 'ㅁ'],
    correct: 'ㅏ',
    explanation: 'ㅏ é vogal. As outras são consoantes.'
  },
  {
    id: 'q2',
    category: 'vocab',
    prompt: 'Qual palavra corresponde a “olá / bom dia”?',
    options: ['감사합니다', '안녕하세요', '고마워요', '잘 가세요'],
    correct: '안녕하세요',
    explanation: '안녕하세요 é a saudação mais usada.'
  },
  {
    id: 'q3',
    category: 'structure',
    prompt: 'Qual sentença tem uma estrutura básica correta?',
    options: ['저 이름은 마리아예요', '이름 저 마리아예요', '마리아예요 이름 저', '저 마리아 이름예요'],
    correct: '저 이름은 마리아예요',
    explanation: 'A ordem natural da frase é “저 이름은 …예요”.'
  },
  {
    id: 'q4',
    category: 'particles',
    prompt: 'Qual opção indica “sou brasileiro”?',
    options: ['저는 브라질 사람이에요.', '저는 브라질에 있어요.', '저는 브라질 좋아해요.', '저는 브라질을 먹어요.'],
    correct: '저는 브라질 사람이에요.',
    explanation: '“브라질 사람” indica nacionalidade.'
  },
  {
    id: 'q5',
    category: 'dialogue',
    prompt: 'Qual resposta se encaixa melhor em “이름이 뭐예요?”',
    options: ['제 이름은 코코예요.', '아침이에요.', '좋아요.', '서울에서 왔어요.'],
    correct: '제 이름은 코코예요.',
    explanation: 'A pergunta pede o nome do interlocutor; a resposta natural diz o nome.'
  }
];

export const CONVERSATION_SCENARIOS = [
  {
    id: 'meeting',
    context: 'Conhecer uma pessoa nova',
    goal: 'Cumprimentar e iniciar uma conversa breve.',
    prompt: '안녕하세요! 저는 마리아예요. 이름이 뭐예요?',
    hint: 'Você pode responder com seu nome e perguntar o nome da outra pessoa.',
    answer: '안녕하세요! 제 이름은 루카예요. 반가워요.',
    translation: 'Olá! Meu nome é Luca. Prazer em conhecê-lo.',
    next: 'Você também pode perguntar: 어디에서 왔어요?'
  },
  {
    id: 'hobbies',
    context: 'Falar sobre hobbies',
    goal: 'Descrever gostos com frases curtas.',
    prompt: '취미가 뭐예요?',
    hint: 'Tente dizer uma atividade que você gosta e por quê.',
    answer: '저는 음악을 듣는 걸 좋아해요. 그리고 여행도 좋아해요.',
    translation: 'Eu gosto de ouvir música. Também gosto de viajar.',
    next: 'Se quiser continuar: 요즘 어떤 음악을 들어요?'
  },
  {
    id: 'food',
    context: 'Conversar sobre comida',
    goal: 'Comentar sobre pratos e preferências.',
    prompt: '한국 음식 좋아해요?',
    hint: 'Você pode falar sobre um prato que gosta ou o que já experimentou.',
    answer: '네, 김치찌개 좋아해요. 매운 음식도 좋아해요!',
    translation: 'Sim, gosto de doenjang-jjigae. Também gosto de comida picante!',
    next: 'Uma pergunta complementar seria: 좋아하는 한국 음식이 뭐예요?'
  }
];

export const LESSONS = [
  {
    id: 'go-billy-korean-playlist',
    title: 'Go! Billy Korean — Aprendendo Hangul e fundamentos',
    description: 'Playlist introdutória com explicações claras e apoio para o início do estudo.',
    level: 0,
    module: 'Fundamentos',
    category: 'Hangul',
    type: 'playlist',
    url: 'https://www.youtube.com/playlist?list=PLbFrQnW0BNMUkAFj4MjYauXBPtO3I9O_k',
    embedUrl: 'https://www.youtube.com/embed/videoseries?list=PLbFrQnW0BNMUkAFj4MjYauXBPtO3I9O_k',
    duration: null,
    language: 'coreano',
    subtitles: 'verificar disponibilidade',
    status: 'available',
    completed: false,
    featured: true
  },
  {
    id: 'phrase-101',
    title: '101 frases essenciais para iniciantes',
    description: 'Expressões úteis para uso imediato em situações básicas.',
    level: 1,
    module: 'Primeiras conversas',
    category: 'Conversação',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=d9nOBAeBa-M',
    embedUrl: 'https://www.youtube.com/embed/d9nOBAeBa-M',
    duration: null,
    language: 'coreano',
    subtitles: 'verificar disponibilidade',
    status: 'available',
    completed: false
  },
  {
    id: 'seemile-playlist',
    title: 'Seemile Korean — Fundamentos e prática',
    description: 'Aulas introdutórias para revisar Hangul e desenvolver base de pronúncia e frases.',
    level: 0,
    module: 'Fundamentos',
    category: 'Hangul',
    type: 'playlist',
    url: 'https://youtube.com/playlist?list=PLAR6PIbgTNh17YQutUNgJ7MWZ9nb4evPI',
    embedUrl: 'https://www.youtube.com/embed/videoseries?list=PLAR6PIbgTNh17YQutUNgJ7MWZ9nb4evPI',
    duration: null,
    language: 'coreano',
    subtitles: 'verificar disponibilidade',
    status: 'available',
    completed: false
  },
  {
    id: 'talk-to-me-in-korean-channel',
    title: 'Talk To Me In Korean — canal de escuta e conversação natural',
    description: 'Recurso externo para explorar materiais de níveis iniciante e intermediário com foco em fala natural.',
    level: 2,
    module: 'Escuta natural',
    category: 'Escuta',
    type: 'external',
    url: 'https://www.youtube.com/@talktomeinkorean',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'verificar disponibilidade',
    status: 'available',
    completed: false
  },
  {
    id: 'koreanclass101-starting',
    title: 'KoreanClass101 — Getting started',
    description: 'Introdução ao curso, cumprimentos e estrutura básica de frases.',
    level: 1,
    module: 'Introdução',
    category: 'Estrutura',
    type: 'external',
    url: 'https://www.koreanclass101.com/lesson-library/getting-started-with-koreanclass101',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'verificar disponibilidade',
    status: 'available',
    completed: false
  },
  {
    id: 'koreanclass101-everyday',
    title: 'KoreanClass101 — Absolute beginner Korean for every day',
    description: 'Vocabulário aplicado e frases do cotidiano para uso imediato.',
    level: 1,
    module: 'Vocabulário prático',
    category: 'Vocabulário',
    type: 'external',
    url: 'https://www.koreanclass101.com/lesson-library/absolute-beginner-korean-for-every-day',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'verificar disponibilidade',
    status: 'available',
    completed: false
  },
  {
    id: 'slot-01',
    title: 'Aula em preparação — Hangul básico 01',
    description: 'Slot reservado para uma aula sobre vogais, consoantes e leitura inicial.',
    level: 0,
    module: 'Fundamentos',
    category: 'Hangul',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-02',
    title: 'Aula em preparação — Sons e pronúncia',
    description: 'Reservado para conteúdo de pronúncia e regras básicas de alteração sonora.',
    level: 0,
    module: 'Pronúncia',
    category: 'Pronúncia',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-03',
    title: 'Aula em preparação — Cumprimentos naturais',
    description: 'Situações de saudações em formato autêntico e contextualizado.',
    level: 1,
    module: 'Saudações',
    category: 'Conversação',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-04',
    title: 'Aula em preparação — Apresentação pessoal',
    description: 'Conteúdo para falar nome, nacionalidade e profissional.',
    level: 1,
    module: 'Apresentação',
    category: 'Conversação',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-05',
    title: 'Aula em preparação — Presente e passado',
    description: 'Prática com estruturas verbais e tempo verbal em frases curtas.',
    level: 2,
    module: 'Tempo verbal',
    category: 'Gramática',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-06',
    title: 'Aula em preparação — Partículas de tópico e objeto',
    description: 'Explicação de partículas e combinação com verbo e substantivos.',
    level: 2,
    module: 'Estrutura da frase',
    category: 'Gramática',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-07',
    title: 'Aula em preparação — Família e rotina',
    description: 'Conversação sobre rotina doméstica e relações pessoais.',
    level: 3,
    module: 'Vida diária',
    category: 'Conversa cotidiana',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-08',
    title: 'Aula em preparação — Pedido de informações',
    description: 'Como perguntar e responder corretamente em contextos práticos.',
    level: 3,
    module: 'Pedido de informações',
    category: 'Conversação',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-09',
    title: 'Aula em preparação — Expressões coloquiais',
    description: 'Incorporar expressões informais e contexto de uso.',
    level: 4,
    module: 'Linguagem natural',
    category: 'Colóquio',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-10',
    title: 'Aula em preparação — Contar histórias e reações',
    description: 'Estruturar narrativas curtas e responder de forma espontânea.',
    level: 4,
    module: 'Narrativa',
    category: 'Escuta',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-11',
    title: 'Aula em preparação — Discussões e argumentos',
    description: 'Conteúdo para debates curtos e opiniões com maior clareza.',
    level: 5,
    module: 'Discussão',
    category: 'Debate',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  },
  {
    id: 'slot-12',
    title: 'Aula em preparação — Manutenção de conversa avançada',
    description: 'Como continuar uma conversa longa, fazer perguntas e manter o fluxo.',
    level: 5,
    module: 'Conversação avançada',
    category: 'Prática',
    type: 'pending',
    url: '',
    embedUrl: null,
    duration: null,
    language: 'coreano',
    subtitles: 'pendente',
    status: 'pending',
    completed: false
  }
];
