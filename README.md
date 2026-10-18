# Haneul

Plataforma de estudo de coreano em HTML, CSS e JavaScript. O tutor usa a Gemini API por REST; nenhuma chave é enviada ao navegador. O projeto pode ser servido localmente pelo backend Node.js ou implantado no Netlify com uma Function.

## Auditoria da arquitetura

- Frontend estático: `index.html`, `src/styles.css`, `src/app.js`, `src/tutor.js` e `src/data/lessons.js`.
- Backend: `server.js`, com endpoints locais `/api/health` e `/api/chat`.
- Netlify: `netlify/functions/api.mjs` expõe as mesmas rotas sem alterar o frontend; `scripts/build.mjs` publica somente os arquivos públicos necessários.
- Não há framework, hospedagem declarada, autenticação ou dependências npm de runtime.
- A integração Gemini está isolada em `src/services/gemini.js`; validação, prompt e saneamento estão em `src/services/tutor-request.js`.
- O modelo padrão é `gemini-2.5-flash`, listado na [documentação oficial de modelos](https://ai.google.dev/gemini-api/docs/models). Consulte a [página de preços](https://ai.google.dev/gemini-api/docs/pricing) para limites e modelos disponíveis no nível gratuito; condições variam por conta, região e podem mudar.

## Requisitos e configuração

- Node.js 18.18 ou superior.
- Uma chave Gemini API válida, criada em [Google AI Studio](https://aistudio.google.com/apikey), com a Generative Language API habilitada.
- Não há dependências npm externas a instalar.

1. Copie `.env.example` para `.env` (PowerShell: `Copy-Item .env.example .env`).
2. Configure `GEMINI_API_KEY` localmente. O arquivo `.env` é ignorado pelo Git. Nunca cole a chave em HTML, JavaScript do navegador, URL ou mensagens.
3. `GEMINI_MODEL` aceita o nome de modelo somente do lado do servidor; por padrão é `gemini-2.5-flash`. A API rejeita um modelo que não esteja habilitado para a conta.
4. Opcionalmente configure `PORT`, `HANEUL_SESSION_HOURLY_LIMIT`, `HANEUL_IP_HOURLY_LIMIT`, `HANEUL_MAX_RESPONSE_TOKENS`, `HANEUL_MAX_CONCURRENT_REQUESTS`, `HANEUL_ALLOWED_ORIGINS` e `HANEUL_RATE_LIMIT_FILE`.
5. Se uma chave já tiver sido publicada ou enviada ao navegador, revogue-a no Google AI Studio e substitua-a no ambiente privado do servidor.

## Executar localmente

Na pasta do projeto:

```powershell
npm start
```

Abra `http://localhost:3000`; não abra `index.html` diretamente. Execute testes automatizados com:

```powershell
npm test
```

## Publicar no Netlify

1. Conecte este projeto ao site existente no Netlify e configure a raiz do projeto como diretório base.
2. O arquivo `netlify.toml` configura `npm run build`, publica somente a pasta `dist` e registra a Function para `/api/health` e `/api/chat`. Não é preciso mudar `src/tutor.js` nem criar redirects.
3. Em **Site configuration → Environment variables**, confirme que a chave está cadastrada com o nome exato `GEMINI_API_KEY`, disponível para Functions/Runtime. O valor deve permanecer privado; não o coloque em `netlify.toml`, no frontend ou neste repositório.
4. Opcionalmente cadastre `GEMINI_MODEL` (padrão `gemini-2.5-flash`), `HANEUL_MAX_RESPONSE_TOKENS` (padrão 600), `HANEUL_SESSION_HOURLY_LIMIT` (20), `HANEUL_IP_HOURLY_LIMIT` (60) e `HANEUL_MAX_CONCURRENT_REQUESTS` (4). Depois de alterar variáveis, faça um novo deploy.
5. Faça o deploy e teste no domínio publicado: `/api/health` deve retornar `{"configured":true,"provider":"Gemini"}`; em seguida envie uma pergunta pela área Haneul AI.

O build copia uma lista explícita de arquivos estáticos para `dist`, evitando publicar o servidor local, funções e arquivos de configuração. O limite de requisições da Function usa memória da instância aquecida; instâncias serverless podem reiniciar ou escalar, portanto esse limite é uma proteção básica, não uma cota global confiável. Configure limites/alertas de uso no Google AI Studio/Cloud e, para limitar abuso entre instâncias, adicione um rate limiter compartilhado ou controle de tráfego no provedor.

## Controles implementados

- API fixa da Gemini `generateContent`; modelo não é escolhido pelo cliente e a chave segue no header `x-goog-api-key` do servidor, nunca na URL.
- Checagem do tipo de conteúdo, tamanho do corpo (32 KiB), mensagem (2.000 caracteres), histórico (12 mensagens/12.000 caracteres), saída limitada por tokens, timeout de 45 s e concorrência limitada.
- Mensagens vazias/malformadas, conteúdo excessivo, modelo fora do formato e resposta do provedor sem texto são rejeitados; erros brutos do provedor não são devolvidos.
- No servidor local, rate limit por IP e sessão com estado persistido em `.haneul-rate-limits.json` (identificadores com hash e salt aleatório, sem salvar IP ou conteúdo de conversa). Se o armazenamento persistente falhar, as requisições são rejeitadas; não há fallback para contadores em memória. Na Function Netlify, os limites são por instância aquecida e não são globais.
- CORS bloqueia origens diferentes por padrão. Para frontend hospedado em outro domínio, configure `HANEUL_ALLOWED_ORIGINS` com origens exatas, separadas por vírgula. CORS não substitui autenticação nem é proteção contra abuso.
- O backend serve somente arquivos públicos explicitamente permitidos; `server.js`, `.env`, configuração e estado do rate limit não são servidos como arquivos estáticos.
- Histórico do chat fica em `sessionStorage` (até 40 mensagens durante a sessão do separador) e **Nova conversa** permite apagar mensagens e dificuldades locais. Conteúdo recente do progresso pode ser enviado à Gemini quando necessário.

## Hospedagem e limites residuais

O backend local foi implementado para Node.js em uma única instância com disco persistente. No Netlify, o código de `server.js` não executa: as Functions são a camada server-side e leem `GEMINI_API_KEY` do ambiente privado do Netlify.

O arquivo persistente de rate limit requer disco durável. Ambientes serverless, efêmeros ou com múltiplas réplicas devem trocar esse armazenamento por Redis ou serviço compartilhado antes de produção; não coloque o arquivo em pasta pública. Não há login: IP/sessão são controles básicos, não cotas confiáveis por pessoa. Atrás de proxy reverso, configure controle de uso no proxy ou uma store compartilhada consciente de IP confiável; o backend não confia em `X-Forwarded-For`.

Configure limites e alertas também no Google AI Studio/Cloud. A camada gratuita tem disponibilidade e limites que podem mudar; não há garantia de serviço gratuito ou irrestrito. As conversas enviadas são processadas pela Gemini API. Segundo a página de preços atual, conteúdo do nível gratuito pode ser usado para aprimorar produtos; revise os [termos atuais](https://ai.google.dev/gemini-api/terms) antes de compartilhar qualquer dado e não envie informações pessoais/confidenciais.

## Voz

A interação por voz só deve avançar depois de testar uma resposta real de texto da Gemini API. O reconhecimento do navegador pode processar o áudio por um serviço remoto; a próxima etapa deverá pedir ação explícita para o microfone, permitir editar a transcrição, não gravar áudio e tratar permissões/voz coreana com transparência. Voz permanece pendente até a validação real do chat de texto.
