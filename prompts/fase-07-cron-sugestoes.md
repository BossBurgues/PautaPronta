# Fase 7 — Sugestões semanais (Cron + KV)

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seções 1 (Automação) e 4 (`GET /api/suggestions` e Cron), `docs/DIAGRAMAS.md` seção 4,
`PLANO_EXECUCAO.md` seção 3 (D9) e `.agent/rules/pauta-pronta.md`. Reutilize `fetchFeeds` (`worker/src/rss.js`),
`callGemini` (`worker/src/gemini.js`), `buildSuggestionsPrompt` e `GEMINI_SUGGESTIONS_SCHEMA` (`shared/prompt.js`).

## Objetivo
Toda segunda às 09:00 UTC (06:00 de Brasília) o Worker grava 2–3 sugestões de pauta em KV; ao abrir o app, o
Lucivandro vê "Sugestões da semana" e transforma uma delas em carrossel com um clique.

## Fora do escopo
Gerar carrosséis completos no cron (gasta cota — D9). Notificações por e-mail/WhatsApp.

## Tarefas

### 1. `worker/src/suggestions.js`
- `validateSuggestions(obj)` → `{ valid, errors, suggestions }`: aceita 2–3 itens; cada um com `theme` (3–80),
  `angle` (≤ 200) e `sources` com ≥ 1 URL http(s). Corta excesso acima de 3. Mensagens em português.
- `runWeekly(env)`:
  1. `feeds = (env.DEFAULT_FEEDS || '').split(',').map(s => s.trim()).filter(Boolean)`;
  2. `fetchFeeds(feeds, { maxItems: 10 })`;
  3. `callGemini` com `buildSuggestionsPrompt({ topics: env.TOPICS, items })`, `useWebSearch: false`,
     `responseSchema: GEMINI_SUGGESTIONS_SCHEMA`;
  4. `extractJson` → `validateSuggestions`; inválido → 1 retry com `buildFixPrompt`; se falhar, **não** sobrescreve o KV
     e faz `console.error`;
  5. `env.KV.put('weekly_draft', JSON.stringify({ generatedAt: new Date().toISOString(), suggestions }))`.
- Teste `worker/src/suggestions.test.js` para `validateSuggestions` (válido, 1 item, 4 itens cortados para 3, URL inválida).

### 2. `worker/src/index.js`
- `scheduled(event, env, ctx)` → `ctx.waitUntil(runWeekly(env))`.
- `GET /api/suggestions` (token obrigatório) → `{ ok: true, generatedAt, suggestions }` ou
  `{ ok: true, generatedAt: null, suggestions: [] }` se não houver.
- `POST /api/suggestions/run` (token obrigatório, **conta no limite diário**) → roda `runWeekly` na hora e devolve o
  resultado. Serve para testar em produção e para o Lucivandro pedir sugestões novas sob demanda.
  Erros de cota/IA seguem o mesmo padrão de `/api/generate`.

### 3. Frontend
- `api.js`: `getSuggestions(config)` e `runSuggestions(config)`.
- `frontend/src/components/SuggestionsCard.jsx` no topo da aba **Gerar**:
  - carrega ao montar a aba (só se houver token); falha silenciosa (não atrapalha a tela);
  - título "Sugestões da semana" + data em pt-BR ("geradas em segunda, 20/10");
  - cada sugestão: tema em destaque, ângulo, fontes (links que abrem em nova aba, `rel="noopener noreferrer"`),
    botões **Gerar agora** (preenche o tema com `theme + ' — ' + angle` e foca o botão Gerar) e **Salvar como ideia**
    (usa `useIdeas`, com `links` = URLs das fontes e `notes` = ângulo);
  - botão "Dispensar" que esconde até a próxima semana (`pp:dismissedWeek = generatedAt`);
  - botão discreto "Pedir novas sugestões" → `runSuggestions` (com aviso "usa 1 geração da cota do dia").
  - vazio: "Ainda não há sugestões. Elas chegam toda segunda de manhã." + botão "Pedir agora".

## Verificação (rode e mostre a saída)
1. `npm test` e `npm run build` sem erros.
2. Dentro de `worker/`: `npx wrangler dev --test-scheduled`. Em outro terminal dispare o cron:
   `curl.exe "http://localhost:8787/__scheduled?cron=0+9+*+*+1"`
   (em versões novas do Wrangler o caminho pode ser `/cdn-cgi/handler/scheduled`; use o que a saída do `wrangler dev` indicar).
3. Adicione ao `scripts/smoke.mjs` o caso `GET /api/suggestions` com token → 200 e 2–3 sugestões; rode `npm run smoke`.
4. No navegador: aba Gerar mostra o card; "Gerar agora" preenche o tema; "Salvar como ideia" aparece no Banco de ideias;
   "Dispensar" esconde e continua escondido após recarregar. Screenshot.

## Validação humana
- As 3 sugestões são dos temas de interesse do Lucivandro? As fontes abrem?
- Se os temas estiverem genéricos, ajuste `TOPICS` no `wrangler.toml` e `buildSuggestionsPrompt`.

## Commit
```bash
git add -A
git commit -m "fase 7: sugestões semanais com cron e KV"
git tag fase-7
```

## Ao terminar
Marque as tarefas da F7 em `PROGRESSO.md`, resuma e PARE.
