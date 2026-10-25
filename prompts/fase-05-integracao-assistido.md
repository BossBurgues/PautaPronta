# Fase 5 — Integração front ↔ Worker + Modo assistido

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seções 1, 4 e 7 (itens 2 e 5), `docs/DIAGRAMAS.md` seções 2, 3 e 8 (estados da tela Gerar),
`PLANO_EXECUCAO.md` seção 3 (D2, D7) e `.agent/rules/pauta-pronta.md`. O Worker da fase 4 já responde em
`http://localhost:8787`. A tela Revisão (fases 2–3) já funciona com `useDraft`.

## Objetivo
Tela **Gerar** chamando a API de verdade e **modo assistido** funcionando 100% no navegador (sem Worker), com
queda automática para ele em 429/erro.

## Fora do escopo
Perfil visual, banco de ideias, histórico (fase 6). Sugestões semanais (fase 7).

## Tarefas

### 1. Config mínima — `frontend/src/state/useConfig.js`
Hook que lê/grava `pp:config` com este formato (a fase 6 completa a tela):
```js
{
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  token: '',
  profile: DEFAULT_PROFILE,
  feeds: [
    { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', enabled: true },
    { name: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', enabled: true },
  ],
  defaults: { slideCount: 5, formats: ['linkedin', 'instagram'], useWebSearch: false, tone: 'profissional-didatico' },
}
```
Faça merge raso com o salvo (campos novos no padrão aparecem para quem já tem config antiga).

Na aba **Config**, por enquanto, só um `AccessForm.jsx`: campos "URL da API" e "Token de acesso" (`type="password"`,
com botão mostrar/ocultar) e botão "Testar conexão" que chama `GET {apiUrl}/api/health` e mostra OK/erro.

### 2. Cliente da API — `frontend/src/api.js`
```js
export class ApiError extends Error {
  constructor({ status, code, message, fallbackToAssisted = false, errors = [] }) {
    super(message); Object.assign(this, { status, code, fallbackToAssisted, errors });
  }
}
```
- `request(config, path, { method = 'GET', body, timeoutMs = 90000 })`: `fetch` com `Authorization: Bearer {token}`,
  JSON, `AbortController`. Erro de rede/timeout → `ApiError({ status: 0, code: 'network', fallbackToAssisted: true,
  message: 'Não consegui falar com o servidor.' })`. Resposta `ok: false` → `ApiError` com os campos do corpo.
- `generate(config, { theme, slideCount, formats, useWebSearch, tone })` → envia também
  `sources: config.feeds.filter(f => f.enabled).map(f => f.url)`.
- `health(config)`.
- Mensagens amigáveis por `code`: `unauthorized` → "Token inválido. Confira na aba Config.";
  `quota`/`daily_limit` → "A cota gratuita acabou por hoje. Use o modo assistido — funciona igual e sem custo.";
  `invalid_ai_output` → "A IA respondeu fora do formato. Tente de novo ou use o modo assistido.";
  `network` → "Sem conexão com o servidor. Use o modo assistido."

### 3. Tela Gerar — `frontend/src/components/GenerateForm.jsx`
- Campos: **Tema** (textarea, 3–200 caracteres, contador), **Formatos** (checkbox LinkedIn / Instagram),
  **Nº de slides** (select 4–7), **Buscar na web** (toggle, com dica "usa mais cota; deixe desligado nos testes"),
  botão **Gerar** e botão secundário **Modo assistido**.
- Estados conforme `docs/DIAGRAMAS.md` seção 8: `idle`, `loading` (botão desabilitado, texto "Pesquisando fontes e
  escrevendo… pode levar até 1 minuto"), `error` (mensagem + "Tentar de novo" + "Usar modo assistido").
- Sucesso: `setContent(content)` do `useDraft`, guardar `usedSources`/`warnings` para exibir, e trocar para a aba Revisão.
- `fallbackToAssisted: true` → abrir o painel do modo assistido automaticamente, já com o tema preenchido.
- Sem token configurado → aviso com botão "Ir para Config" no lugar do botão Gerar (o modo assistido continua disponível).
- Aceite uma prop `initialTheme` (a fase 6 e 7 usam para "gerar a partir de").

### 4. Modo assistido — `frontend/src/components/AssistedPanel.jsx`
- Passo 1: textarea **somente leitura** com `buildAssistedPrompt({ theme, slideCount, tone, feedUrls })` de
  `shared/prompt.js` + botão **Copiar prompt** + texto "Cole em gemini.google.com, chatgpt.com ou outro assistente gratuito."
- Passo 2: textarea "Cole aqui a resposta da IA" + botão **Usar resposta**.
- Ao usar: `extractJson` → `normalizeContent` → todas as fontes com `verified: false` → `validateContent`,
  **tudo no navegador** com o código de `shared/` (não chama o Worker).
  - Válido: `setContent`, vai para Revisão.
  - Inválido: lista dos `errors` em português + botão **Copiar pedido de correção** (`buildFixPrompt(errors)`).
  - Warnings não bloqueiam.
- Funciona sem token e com o Worker desligado.

### 5. Revisão
Se o conteúdo veio da API, mostre no topo da Revisão um bloco recolhível "Fontes consultadas" com `usedSources` e,
se houver, `feedErrors` ("Não consegui ler: …"). Mantenha o selo "verificar" das fontes não verificadas.

### 6. Teste — `frontend/src/api.test.js`
Com `globalThis.fetch` substituído por um mock (`vi.fn`):
- resposta 200 `ok: true` → retorna o corpo;
- resposta 429 `{ ok:false, error:'quota', fallbackToAssisted:true }` → lança `ApiError` com `code: 'quota'` e `fallbackToAssisted: true`;
- `fetch` rejeitando → `ApiError` `code: 'network'`;
- header `Authorization` enviado como `Bearer abc`.

## Verificação (rode e mostre a saída)
1. `npm test` e `npm run build` sem erros.
2. Worker e front rodando. Config: preencha a URL e o token (o usuário digita o token; você não lê o `.dev.vars` para isso),
   "Testar conexão" → OK.
3. Gere "Transformação digital em pequenas empresas", 5 slides, busca desligada → abre a Revisão com conteúdo real. Screenshot.
4. **Simule o 429**: rode o Worker com `DAILY_LIMIT=0`
   (`npx wrangler dev --var DAILY_LIMIT:0` dentro de `worker/`) → Gerar → aparece o aviso de cota e o painel assistido abre sozinho.
5. **Modo assistido sem Worker**: pare o Worker, clique "Modo assistido", cole o conteúdo de `shared/fixtures/exemplo.json`
   na caixa de resposta → abre a Revisão com as fontes marcadas "verificar".
6. Cole `{"topic":"x"}` → lista de erros + "Copiar pedido de correção" funciona.

## Validação humana
- Copiar o prompt assistido, colar no Gemini (app gratuito) e no ChatGPT, trazer as respostas e ver se renderizam.
- **Marco M2**: gerar 5 temas reais do Lucivandro (busca desligada e ligada). Anotar em `PROGRESSO.md` o que ajustar
  no `shared/prompt.js` (tom, tamanho, fontes) e fazer esses ajustes antes da fase 6.

## Commit
```bash
git add -A
git commit -m "fase 5: integração com a API e modo assistido"
git tag fase-5
```

## Ao terminar
Marque as tarefas da F5 em `PROGRESSO.md`, resuma e PARE.
