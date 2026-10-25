# Fase 0 — Scaffold do monorepo

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Projeto **Pauta Pronta**: app web que gera rascunhos de carrossel para LinkedIn/Instagram. Leia `PLANO_EXECUCAO.md`
(seções 3 e 4) e `.agent/rules/pauta-pronta.md` antes de começar. Esta fase só cria a estrutura; nenhuma funcionalidade.

## Objetivo
Monorepo com npm workspaces na **raiz desta pasta** (`Lucivandro/`), contendo `frontend/` (Vite + React),
`worker/` (Cloudflare Worker com Hono) e `shared/` (código comum), com testes rodando via `vitest`.

## Fora do escopo
Qualquer tela, rota além de `/api/health`, lógica de IA, RSS, canvas. Não use `npm create vite` nem `npm create cloudflare`
(são interativos). Crie os arquivos à mão.

## Tarefas

1. `git init` (se ainda não for repositório). Branches `dev` (padrão) e `prod` — ver README, seção 7.
2. **`.gitignore`** na raiz:
   ```
   node_modules/
   dist/
   .wrangler/
   .dev.vars
   .env.local
   .env.*.local
   *.log
   .DS_Store
   ```
3. **`package.json`** da raiz:
   ```json
   {
     "name": "pauta-pronta",
     "private": true,
     "type": "module",
     "workspaces": ["frontend", "worker"],
     "scripts": {
       "dev:front": "npm run dev -w frontend",
       "dev:worker": "npm run dev -w worker",
       "build": "npm run build -w frontend",
       "test": "vitest run"
     }
   }
   ```
4. **`vitest.config.js`** na raiz:
   ```js
   import { defineConfig } from 'vitest/config';

   export default defineConfig({
     test: {
       environment: 'node',
       include: ['shared/**/*.test.js', 'worker/src/**/*.test.js', 'frontend/src/**/*.test.js'],
     },
   });
   ```
5. **`shared/`**: crie `shared/README.md` com uma linha ("Código compartilhado entre frontend e worker: schema, validação,
   prompts.") e `shared/smoke.test.js`:
   ```js
   import { describe, it, expect } from 'vitest';
   describe('scaffold', () => { it('roda testes', () => { expect(1 + 1).toBe(2); }); });
   ```
6. **`frontend/`** (crie à mão):
   - `frontend/package.json`: `name: "frontend"`, `private: true`, `type: "module"`, scripts
     `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`.
   - `frontend/vite.config.js`:
     ```js
     import { defineConfig } from 'vite';
     import react from '@vitejs/plugin-react';

     export default defineConfig({
       plugins: [react()],
       server: { port: 5173, fs: { allow: ['..'] } },
     });
     ```
   - `frontend/index.html`: `lang="pt-BR"`, título "Pauta Pronta", `<div id="root">`, `<script type="module" src="/src/main.jsx">`,
     e as fontes **Inter, Montserrat, Poppins, Lora e Merriweather** (400 e 700) servidas localmente de `frontend/public/fonts` via `src/fonts.css` — nunca do Google Fonts
     (ver regra 11a).
   - `frontend/src/main.jsx`: monta `<App />` com `React.StrictMode` e importa `./styles.css`.
   - `frontend/src/App.jsx`: cabeçalho "Pauta Pronta" e uma barra de abas **Gerar · Revisão · Ideias · Histórico · Config**
     controlada por `useState('revisao')`. Cada aba mostra só um `<p>` "Em construção (fase N)". Sem router.
   - `frontend/src/styles.css`: variáveis CSS em `:root` (`--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--danger`,
     `--ok`, `--radius`, `--gap`), fonte Inter, layout simples centralizado (máx. 1280 px), estilo de abas, botões, inputs,
     textarea. Sóbrio, fundo claro.
   - `frontend/.env.example` com `VITE_API_URL=http://localhost:8787`.
7. **`worker/`**:
   - `worker/package.json`: `name: "worker"`, `private: true`, `type: "module"`, scripts `"dev": "wrangler dev"`,
     `"deploy": "wrangler deploy"`.
   - `worker/wrangler.toml`:
     ```toml
     name = "pauta-pronta-api"
     main = "src/index.js"
     compatibility_date = "2026-09-01"

     [triggers]
     crons = ["0 9 * * 1"]

     # Local: qualquer id funciona. Na fase 8 o usuário troca pelo id real.
     [[kv_namespaces]]
     binding = "KV"
     id = "local-dev-placeholder"

     [vars]
     GEMINI_MODEL = "gemini-2.5-flash"
     DAILY_LIMIT = "20"
     ALLOWED_ORIGIN = "http://localhost:5173"
     TOPICS = "inteligência artificial, inovação, sustentabilidade, gestão, conformidade"
     DEFAULT_FEEDS = "https://www.technologyreview.com/feed/,https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml"
     ```
     Se o `wrangler dev` reclamar da `compatibility_date`, use a data que ele sugerir.
   - `worker/.dev.vars.example`:
     ```
     GEMINI_API_KEY=cole-aqui-a-chave-do-ai-studio
     ACCESS_TOKEN=troque-por-um-token-longo-aleatorio
     ```
   - `worker/src/index.js`:
     ```js
     import { Hono } from 'hono';
     import { cors } from 'hono/cors';

     const app = new Hono();

     app.use('/api/*', (c, next) =>
       cors({
         origin: (c.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()),
         allowHeaders: ['Content-Type', 'Authorization'],
         allowMethods: ['GET', 'POST', 'OPTIONS'],
       })(c, next),
     );

     app.get('/api/health', (c) => c.json({ ok: true, service: 'pauta-pronta-api' }));

     export default {
       fetch: app.fetch,
       async scheduled(event, env, ctx) {
         // Implementado na fase 7.
       },
     };
     ```
8. Instale as dependências (na raiz):
   ```bash
   npm install -D vitest
   npm install react react-dom -w frontend
   npm install -D vite @vitejs/plugin-react -w frontend
   npm install hono -w worker
   npm install -D wrangler -w worker
   ```
9. Crie `README.md` provisório na raiz: nome do projeto, 3 linhas de descrição e "Ver PLANO_EXECUCAO.md". (O README final é da fase 8.)

## Verificação (rode e mostre a saída)
1. `npm test` → 1 teste passando.
2. `npm run build` → build do frontend sem erro.
3. `npm run dev:worker` (em segundo plano) e então `curl.exe http://localhost:8787/api/health` →
   `{"ok":true,"service":"pauta-pronta-api"}`. Pare o processo depois.
4. `npm run dev:front` (em segundo plano), abra `http://localhost:5173` no navegador do Antigravity, screenshot das abas.
5. `git status --short` não lista `node_modules`, `.dev.vars` nem `.wrangler`.

## Validação humana
- Abrir `http://localhost:5173` e clicar nas 5 abas.
- Conferir que só existem as dependências da regra 7.

## Commit
```bash
git add -A
git commit -m "fase 0: scaffold do monorepo (frontend, worker, shared)"
git tag fase-0
```

## Ao terminar
Marque as tarefas da F0 em `PROGRESSO.md`, resuma o que foi feito e PARE.
