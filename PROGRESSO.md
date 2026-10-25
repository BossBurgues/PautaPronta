# Progresso — Pauta Pronta

O agente marca `[x]` nas tarefas que **verificou**. A linha "Validação humana" só você marca.
O workflow `/proxima-fase` usa este arquivo para saber qual fase vem a seguir.

## Pré-requisitos (você)
- [ ] Levantamento presencial: logo, cores, fonte, @, fontes confiáveis, temas, tom de voz
- [ ] Contas criadas sem cartão (só a partir da F4) — `docs/SETUP_CONTAS.md`

---

## F0 — Scaffold · `prompts/fase-00-scaffold.md`
- [x] Git, `.gitignore`, `package.json` com workspaces, `vitest.config.js`
- [x] `frontend/` (Vite + React à mão, abas, CSS base, Google Fonts)
- [x] `worker/` (Hono, `wrangler.toml`, `/api/health`, `.dev.vars.example`)
- [x] `npm test`, `npm run build`, health via curl OK
- [x] **Validação humana**

## F1 — Contrato compartilhado · `prompts/fase-01-contrato-compartilhado.md`
- [x] `shared/schema.js` (LIMITS, schema Gemini, normalize, validate)
- [x] `shared/json.js` (extractJson)
- [x] `shared/prompt.js` (buildPrompt, buildAssistedPrompt, buildFixPrompt, buildSuggestionsPrompt)
- [x] `shared/fixtures/exemplo.json`
- [x] Testes verdes (> 20)
- [x] **Validação humana**

## F2 — Render + Revisão · `prompts/fase-02-render-revisao.md`
- [x] `state/` (storage, defaults, useDraft)
- [x] `canvas/renderSlide.js` (wrapText, fitText, ensureFonts, layouts)
- [x] Componentes SlidePreview, SlideEditor, CaptionEditor, SourcesList, Review
- [x] Edição ao vivo + rascunho persistido + limites 4–7
- [x] **Validação humana**

## F3 — Exportação · `prompts/fase-03-exportacao.md`
- [x] `canvas/exporters.js` (PNG, ZIP, PDF, mosaico WhatsApp, legenda)
- [x] `ExportPanel.jsx`
- [x] Arquivos conferidos (1080×1350)
- [x] **Validação humana**

### 🏁 Marco M1 — Demo visual com o Lucivandro
- [x] Apresentado
- Ajustes do M1:
  -

## F4 — Worker API · `prompts/fase-04-worker-api.md`
- [x] `rss.js` + teste
- [x] `gemini.js` (callGemini, generateCarousel com retry)
- [x] `sources.js` + teste
- [x] `limits.js` (token, limite diário em KV)
- [x] Rotas `/api/generate` e `/api/assisted-parse`
- [x] `scripts/smoke.mjs` casos 1–5 ✅ e geração real OK
- [x] Nenhuma chave versionada
- [x] **Validação humana**

## F5 — Integração + Modo assistido · `prompts/fase-05-integracao-assistido.md`
- [x] `useConfig` + `AccessForm`
- [x] `api.js` + teste
- [x] `GenerateForm` com estados e fallback
- [x] `AssistedPanel` funcionando sem Worker
- [x] 429 simulado abre o modo assistido
- [x] **Validação humana**

### 🏁 Marco M2 — 5 temas reais gerados localmente
- [ ] Feito
- Ajustes de prompt:
  -

## F6 — Perfil, ideias, histórico · `prompts/fase-06-perfil-ideias-historico.md`
- [x] ProfileForm (logo redimensionado, cores, fonte, @, contraste)
- [x] FeedsForm + padrões de geração
- [x] Perfil aplicado no render e nos exports
- [x] Banco de ideias (CRUD + gerar a partir de)
- [x] Histórico (20 últimos)
- [x] **Validação humana**

## F7 — Sugestões semanais · `prompts/fase-07-cron-sugestoes.md`
- [x] `suggestions.js` + teste
- [x] `scheduled`, `GET /api/suggestions`, `POST /api/suggestions/run`
- [x] `SuggestionsCard`
- [x] Cron testado localmente
- [ ] **Validação humana**

## F8 — Deploy e entrega · `prompts/fase-08-deploy-entrega.md`
- [ ] Scripts de deploy e `.env.production.example`
- [ ] README final
- [ ] Deploy do Worker e do Pages (usuário)
- [ ] Smoke em produção
- [ ] `docs/TESTES_ACEITACAO.md` completo
- [ ] **Validação humana**

### 🏁 Marco M3 — Entregue
- [ ] Capacitação feita
- [ ] Feedback da Comunidade assinado
- [ ] Evidências coletadas
