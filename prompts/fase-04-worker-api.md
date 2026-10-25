# Fase 4 — Worker: RSS, Gemini, verificação de fontes, token e limite diário

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seções 3, 4 e 9, `PLANO_EXECUCAO.md` seção 3 (D4, D5, D6, D7, D8), `docs/DIAGRAMAS.md` seções 2 e 3
e `.agent/rules/pauta-pronta.md`. Reutilize `shared/schema.js`, `shared/json.js` e `shared/prompt.js` (import relativo
`../../shared/...`). **Não** duplique validação nem prompt dentro do Worker.

**Pré-requisito do usuário:** `worker/.dev.vars` criado a partir de `worker/.dev.vars.example`, com `GEMINI_API_KEY`
(do AI Studio, conta sem billing) e um `ACCESS_TOKEN` longo. Ver `docs/SETUP_CONTAS.md`. Se o arquivo não existir,
PARE e peça ao usuário para criá-lo. **Nunca** peça a chave no chat e nunca imprima o conteúdo do `.dev.vars`.

## Objetivo
Rotas `POST /api/generate` e `POST /api/assisted-parse` funcionando localmente com `wrangler dev`, protegidas por token
e limite diário, com tratamento de 429 que orienta o front a cair no modo assistido.

## Fora do escopo
Cron e `/api/suggestions` (fase 7). Deploy (fase 8). Frontend (fase 5). Nenhuma lib de XML.

## Tarefas

### 1. `worker/src/rss.js`
- `parseFeed(xml, feedUrl)` → `[{ title, summary, link, date, source }]`, **só regex**:
  - itens RSS: `/<item[\s>][\s\S]*?<\/item>/gi`; itens Atom: `/<entry[\s>][\s\S]*?<\/entry>/gi`;
  - `title`: conteúdo de `<title>`; `summary`: `<description>` ou `<summary>` ou `<content:encoded>`, sem tags HTML,
    cortado em 300 caracteres; `link`: texto de `<link>` (RSS) ou atributo `href` de `<link ...>` (Atom, prefira
    `rel="alternate"` ou sem `rel`); `date`: `<pubDate>` | `<published>` | `<updated>` | `<dc:date>` → `Date.parse` (ou 0);
    `source`: hostname do `feedUrl`;
  - remova `<![CDATA[ ... ]]>`, decodifique `&amp; &lt; &gt; &quot; &#39; &apos;` e entidades numéricas `&#NNN;`/`&#xHH;`,
    colapse espaços.
- `fetchFeeds(urls, { timeoutMs = 5000, maxBytes = 200_000, maxItems = 6, maxFeeds = 8 })`:
  - usa no máximo `maxFeeds` URLs, todas em paralelo com `Promise.allSettled`;
  - cada `fetch` com `AbortController` (timeout) e header `User-Agent: PautaPronta/1.0`;
  - `const xml = (await res.text()).slice(0, maxBytes)`;
  - junta os itens, remove duplicados (mesmo `link` ou mesmo título em minúsculas), ordena por `date` desc, corta em `maxItems`;
  - retorna `{ items, errors: [{ url, message }] }` (feed que falhar não derruba a geração).
- Teste `worker/src/rss.test.js` com 2 XMLs de exemplo escritos no próprio teste (um RSS 2.0 com CDATA e `&amp;`,
  um Atom com `<link href>`). Só `parseFeed` (sem rede).

### 2. `worker/src/gemini.js`

```js
import { GEMINI_RESPONSE_SCHEMA, normalizeContent, validateContent } from '../../shared/schema.js';
import { extractJson } from '../../shared/json.js';
import { buildPrompt, buildFixPrompt } from '../../shared/prompt.js';

export class QuotaError extends Error {}
export class AiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}
export class AiOutputError extends Error {
  constructor(errors) { super('Resposta da IA inválida'); this.errors = errors; }
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini({ apiKey, model, contents, useWebSearch, responseSchema }) {
  const generationConfig = { temperature: 0.4 };
  // D4: structured output + google_search não funciona em vários modelos. Com busca, pedimos JSON pelo prompt.
  if (!useWebSearch && responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = responseSchema;
  }
  const body = { contents, generationConfig };
  if (useWebSearch) body.tools = [{ google_search: {} }];

  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new QuotaError('Cota gratuita da IA esgotada por agora.');
  if (!res.ok) {
    const detail = await res.text();
    throw new AiError(`Gemini respondeu ${res.status}: ${detail.slice(0, 300)}`, res.status);
  }
  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('') ?? '';
  if (!text) throw new AiError(`A IA não retornou texto (motivo: ${candidate?.finishReason || 'desconhecido'}).`, 502);
  const grounding = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.web)
    .filter(Boolean)
    .map((web) => ({ title: web.title || '', uri: web.uri || '' }));
  return { text, grounding };
}
```

Implemente também `generateCarousel({ env, theme, slideCount, tone, items, useWebSearch })`:
1. `prompt = buildPrompt(...)`; `contents = [{ role: 'user', parts: [{ text: prompt }] }]`.
2. `callGemini` com `model: env.GEMINI_MODEL || 'gemini-2.5-flash'` e `responseSchema: GEMINI_RESPONSE_SCHEMA`.
3. `extractJson` → `normalizeContent` → `validateContent`.
4. Se tiver `errors` (ou `extractJson` lançar): **1 retry** acrescentando ao `contents` a resposta do modelo
   (`role: 'model'`) e `buildFixPrompt(errors)` (`role: 'user'`). Se falhar de novo, `throw new AiOutputError(errors)`.
5. Retorne `{ content, warnings, grounding }` (junte o `grounding` das duas chamadas, se houver retry).

### 3. `worker/src/sources.js`
- `hostOf(url)` → hostname em minúsculas sem `www.` (ou `''` se inválida).
- `verifySources(sources, { items, grounding })` → mesma lista com `verified: true/false`. Uma fonte é verificada se o
  host dela for igual ao host de algum `item.link`, **ou** igual/terminar com algum `grounding.title` (o Gemini costuma pôr
  o domínio no `title`), **ou** igual ao host de algum `grounding.uri` que não seja de `vertexaisearch.cloud.google.com`.
- `buildUsedSources(items, grounding)` → `[{ title, url }]` sem duplicados (itens do RSS + grounding).
- Teste `worker/src/sources.test.js` cobrindo os três casos de verificação e um caso não verificado.

### 4. `worker/src/limits.js`
- `checkToken(c)` → `true` se `Authorization === 'Bearer ' + c.env.ACCESS_TOKEN` e o `ACCESS_TOKEN` existir e tiver
  ≥ 16 caracteres.
- `todayKey()` → `usage:AAAA-MM-DD` no horário de Brasília (`new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)`).
- `getUsage(env)` / `incrementUsage(env)` usando `env.KV` com `expirationTtl: 172800`.
- `isOverLimit(env)` → `getUsage >= Number(env.DAILY_LIMIT || 20)`.

### 5. `worker/src/index.js` — rotas
Mantenha CORS e `/api/health`. Adicione um helper `fail(c, status, error, message, extra = {})` que responde
`{ ok: false, error, message, ...extra }`.

**`POST /api/generate`** (contrato do `BUILD_SPEC.md` seção 4, com o token no header — D7):
1. Sem `GEMINI_API_KEY`/`ACCESS_TOKEN` no env → 500 `config` "Servidor sem configuração. Veja docs/SETUP_CONTAS.md".
2. Token inválido → 401 `unauthorized`.
3. Valida body: `theme` string 3–200; `slideCount` inteiro 4–7 (padrão 5); `formats` subconjunto de
   `['linkedin','instagram']` (padrão ambos); `tone` (padrão `profissional-didatico`); `sources` array de URLs http(s)
   (máx. 8, ignora inválidas); `useWebSearch` booleano (padrão `false`). Sem feeds válidos **e** sem busca →
   400 `bad_request` "Ative a busca na web ou cadastre ao menos um feed RSS.". Outros problemas → 400 com mensagem clara.
4. `isOverLimit` → 429 `daily_limit` com `fallbackToAssisted: true` e mensagem "Limite diário de gerações atingido.".
5. `fetchFeeds(sources)` → `generateCarousel(...)` → `verifySources` → `incrementUsage`.
6. 200: `{ ok: true, content, warnings, usedSources, feedErrors, model }`.
7. Erros: `QuotaError` → 429 `quota` + `fallbackToAssisted: true`; `AiOutputError` → 422 `invalid_ai_output` + `errors` +
   `fallbackToAssisted: true`; `AiError` → 502 `ai_error` + `fallbackToAssisted: true`
   (se status 400 e o texto contiver "API key", mensagem "Chave do Gemini inválida. Confira o .dev.vars / secret.");
   qualquer outro → 500 `internal` "Erro inesperado." e `console.error` do erro.
8. **Nunca** inclua a chave, o token ou o corpo completo da resposta do Gemini em logs ou respostas.

**`POST /api/assisted-parse`**: token obrigatório; body `{ text }` (resposta colada) **ou** `{ content }` (objeto).
`extractJson` (se `text`) → `normalizeContent` → `validateContent`. Todas as fontes com `verified: false`.
Válido → 200 `{ ok: true, content, warnings }`; inválido → 422 `{ ok: false, error: 'invalid_content', errors, warnings }`;
JSON ilegível → 422 com a mensagem do `extractJson`. Não consome cota.

### 6. `scripts/smoke.mjs` (raiz) — teste de fumaça com Node puro
- Lê `ACCESS_TOKEN` de `worker/.dev.vars` (parse simples `CHAVE=valor`) **sem imprimir o valor**.
- Base `http://localhost:8787`. Executa e imprime ✅/❌ por caso:
  1. `GET /api/health` → 200;
  2. `POST /api/generate` sem token → 401;
  3. `POST /api/generate` com `theme: 'x'` → 400;
  4. `POST /api/assisted-parse` com `{ content: <fixture> }` → 200 e `ok: true`;
  5. `POST /api/assisted-parse` com `{ text: 'sem json' }` → 422;
  6. só se rodar com `--real`: `POST /api/generate` com tema "Inteligência artificial na gestão pública", 5 slides,
     `useWebSearch: false` e os feeds de `DEFAULT_FEEDS` → imprime status, nº de slides, títulos, fontes com `verified`,
     `warnings` e `feedErrors`.
- Adicione ao `package.json` da raiz: `"smoke": "node scripts/smoke.mjs"`.

## Verificação (rode e mostre a saída)
1. `npm test` → verdes (inclui `rss.test.js` e `sources.test.js`).
2. `npm run dev:worker` em segundo plano; `npm run smoke` → casos 1 a 5 ✅.
3. `npm run smoke -- --real` → um carrossel real. Mostre títulos e fontes. (Gasta 1 chamada de cota, sem busca web.)
4. `git grep -n -I -E "AIza[0-9A-Za-z_-]{20,}"` → vazio. `git check-ignore worker/.dev.vars` → mostra o caminho.

## Validação humana
- O carrossel do passo 3 faz sentido? As fontes existem (abra as URLs)? Algum número inventado?
- Rode **uma vez** com `useWebSearch: true` (edite o smoke temporariamente ou use curl) para confirmar que o modelo escolhido
  aceita a busca; se der 400, troque `GEMINI_MODEL` por um modelo Flash atual listado no AI Studio.

## Commit
```bash
git add -A
git commit -m "fase 4: worker com RSS, Gemini, verificação de fontes, token e limite diário"
git tag fase-4
```

## Ao terminar
Marque as tarefas da F4 em `PROGRESSO.md`, resuma e PARE.
