# Fase 1 — Contrato compartilhado (`shared/`)

Cole este prompt inteiro numa conversa nova do Antigravity (modo Planning).

---

## Contexto
Leia `BUILD_SPEC.md` seções 5 e 6, `PLANO_EXECUCAO.md` seção 3 (decisões D2, D4, D8) e `.agent/rules/pauta-pronta.md`.
A pasta `shared/` é usada pelo frontend **e** pelo Worker. Tudo aqui deve ser JavaScript puro, sem dependência de
navegador nem de Node (nada de `window`, `document`, `fs`, `process`).

## Objetivo
Criar a fonte única de: limites, schema do Gemini, normalização, validação, extração de JSON e construção de prompts,
mais um JSON de exemplo (fixture) e testes.

## Fora do escopo
Chamar a API do Gemini, UI, Worker. Não instale nenhuma dependência nova.

## Tarefas

### 1. `shared/schema.js`

```js
export const LIMITS = {
  slidesMin: 4,
  slidesMax: 7,
  titleMax: 60,
  bodyMax: 220,
  hashtagsMin: 3,
  hashtagsMax: 5,
  sourcesMin: 2,
  captionLinkedinMax: 3000,
  captionInstagramMax: 2200,
  ctaMax: 150,
};

export const ROLES = ['capa', 'contexto', 'ponto', 'conclusao'];

// Formato aceito pelo campo generationConfig.responseSchema do Gemini (subconjunto de OpenAPI).
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topic: { type: 'STRING' },
    slides: {
      type: 'ARRAY',
      minItems: 4,
      maxItems: 7,
      items: {
        type: 'OBJECT',
        properties: {
          n: { type: 'INTEGER' },
          role: { type: 'STRING', enum: ['capa', 'contexto', 'ponto', 'conclusao'] },
          title: { type: 'STRING' },
          body: { type: 'STRING' },
        },
        required: ['n', 'role', 'title', 'body'],
      },
    },
    caption_linkedin: { type: 'STRING' },
    caption_instagram: { type: 'STRING' },
    hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
    cta: { type: 'STRING' },
    sources: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, url: { type: 'STRING' } },
        required: ['title', 'url'],
      },
    },
  },
  required: ['topic', 'slides', 'caption_linkedin', 'caption_instagram', 'hashtags', 'cta', 'sources'],
};
```

Implemente também, no mesmo arquivo:

**`normalizeContent(raw) → Content`** (nunca lança erro; tolera campos faltando):
- `trim()` em todas as strings; campos ausentes viram `''` ou `[]`.
- `slides`: mantém a ordem, renumera `n` de 1 a N. Se `role` for inválido: primeiro slide = `capa`, último = `conclusao`,
  segundo = `contexto`, demais = `ponto`. **Não** força a capa/conclusão quando o role já é válido.
- `hashtags`: aceita array ou string separada por vírgula/espaço; remove espaços internos; garante `#` no início;
  remove duplicadas (comparação sem diferenciar maiúsculas); corta em `LIMITS.hashtagsMax`.
- `sources`: remove itens sem `url`; remove duplicadas por URL; mantém `verified` se vier booleano, senão omite.
- **Não corta texto** de título/corpo (corte esconde problema; o editor mostra o excesso).

**`validateContent(content) → { valid, errors, warnings }`** (mensagens em português, citando o número do slide):
- `errors` (estruturais; tornam `valid = false`):
  - `topic` vazio;
  - quantidade de slides fora de 4–7;
  - slide sem título ou sem corpo;
  - `caption_linkedin`, `caption_instagram` ou `cta` vazios;
  - menos de 3 hashtags;
  - menos de 2 fontes; fonte com URL que não começa com `http://` ou `https://` ou que `new URL()` rejeita.
- `warnings` (não bloqueiam): título > 60, corpo > 220, legenda acima do limite da rede, CTA > 150,
  CTA que não termina com `?`.
- Exemplo de mensagem: `"Slide 3: título com 72 caracteres (máximo 60)."`

### 2. `shared/json.js`

```js
// Extrai o primeiro objeto JSON de um texto de IA (com ou sem ```json, com texto antes/depois).
export function extractJson(text) {
  if (typeof text !== 'string') throw new Error('Resposta vazia.');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('Não encontrei um objeto JSON na resposta.');
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (e) {
    throw new Error('O JSON da resposta está mal formado: ' + e.message);
  }
}
```

### 3. `shared/prompt.js`

Exporte:
- **`RULES`**: string com as "Regras obrigatórias" do `BUILD_SPEC.md` seção 6, palavra por palavra, mais:
  - "Título de cada slide com no máximo 60 caracteres; corpo com no máximo 220 caracteres."
  - "O primeiro slide tem role 'capa', o último 'conclusao', o segundo 'contexto' e os demais 'ponto'."
  - "Escreva em português do Brasil."
- **`JSON_SHAPE`**: string com um exemplo do formato JSON esperado (campos do schema, valores descritivos tipo `"string"`).
- **`buildPrompt({ theme, slideCount, tone, items, useWebSearch })`**: monta o prompt do spec seção 6.
  `items` é `[{ title, summary, link }]`; lista cada um como `- {title} — {summary} ({link})`. Se `items` estiver vazio,
  escreve "Nenhum feed fornecido; use apenas a busca na web." Quando `useWebSearch` for true, acrescente
  "Pesquise na web em fontes confiáveis e cite as URLs reais encontradas." e inclua o `JSON_SHAPE` com a frase
  "Responda com um único objeto JSON neste formato, sem texto antes ou depois:" (decisão D4).
  `tone` padrão: `profissional-didatico` → descreva como "profissional e didático".
- **`buildAssistedPrompt({ theme, slideCount, tone, feedUrls })`**: mesmo conteúdo, para colar em um assistente externo.
  Começa com "Você vai me ajudar a criar um carrossel." Pede para pesquisar na web, sugere as `feedUrls` como pontos de
  partida e **sempre** inclui o `JSON_SHAPE` com "Responda SOMENTE com um bloco de código ```json```."
- **`buildFixPrompt(errors)`**: "Sua resposta anterior tem estes problemas: …(lista)… Corrija e responda somente com o
  objeto JSON completo, no mesmo formato."
- **`buildSuggestionsPrompt({ topics, items })`**: pede 3 sugestões de pauta para a semana nos `topics`, baseadas nos
  `items`, cada uma com `theme` (≤ 80 caracteres), `angle` (≤ 200, por que é relevante agora) e `sources` (≥ 1, título+URL
  dos itens). Mesmas regras de veracidade e proibições do `RULES`.
- **`GEMINI_SUGGESTIONS_SCHEMA`**: schema no mesmo estilo do `GEMINI_RESPONSE_SCHEMA` para
  `{ suggestions: [{ theme, angle, sources: [{ title, url }] }] }` (2 a 3 itens).

### 4. `shared/fixtures/exemplo.json` (copie exatamente)

```json
{
  "topic": "LGPD na prática",
  "slides": [
    { "n": 1, "role": "capa", "title": "LGPD na prática: o essencial para sua empresa", "body": "Um resumo direto da Lei Geral de Proteção de Dados e do que ela muda no dia a dia." },
    { "n": 2, "role": "contexto", "title": "O que é a LGPD", "body": "A Lei nº 13.709/2018 regula o tratamento de dados pessoais no Brasil, em meios físicos e digitais, por empresas e órgãos públicos." },
    { "n": 3, "role": "ponto", "title": "Todo tratamento precisa de uma base legal", "body": "O art. 7º lista as hipóteses que autorizam o tratamento, como consentimento, cumprimento de obrigação legal e execução de contrato." },
    { "n": 4, "role": "ponto", "title": "O titular tem direitos garantidos", "body": "Pelo art. 18, a pessoa pode pedir confirmação, acesso, correção e eliminação dos seus dados, entre outros direitos." },
    { "n": 5, "role": "conclusao", "title": "Quem fiscaliza e o que está em jogo", "body": "A ANPD fiscaliza a lei. A multa simples pode chegar a 2% do faturamento, limitada a R$ 50 milhões por infração (art. 52)." }
  ],
  "caption_linkedin": "A LGPD já faz parte da rotina de qualquer empresa que lida com dados pessoais, de clientes a colaboradores. Neste carrossel, reuni os pontos essenciais da Lei nº 13.709/2018: o que ela regula, por que toda operação precisa de uma base legal, quais direitos o titular pode exercer e quem fiscaliza o cumprimento. Um bom ponto de partida para revisar processos internos.",
  "caption_instagram": "LGPD sem complicação: o que é, base legal, direitos do titular e fiscalização. Arrasta pro lado e salva pra consultar depois.",
  "hashtags": ["#LGPD", "#ProtecaoDeDados", "#Compliance", "#Privacidade"],
  "cta": "Sua empresa já mapeou quais dados pessoais trata hoje?",
  "sources": [
    { "title": "Lei nº 13.709/2018 (LGPD) — Planalto", "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" },
    { "title": "Autoridade Nacional de Proteção de Dados (ANPD)", "url": "https://www.gov.br/anpd/pt-br" }
  ]
}
```

### 5. Testes

`shared/schema.test.js`:
- fixture é válida (`valid === true`, `errors` vazio, `warnings` vazio);
- 3 slides → erro; 8 slides → erro;
- título com 61 caracteres → **warning**, continua `valid`;
- 1 fonte → erro; fonte com `url: "ftp://x"` → erro;
- 2 hashtags → erro;
- `normalizeContent` renumera slides (`n` 3,1,2 → 1,2,3), adiciona `#` (`"ia"` → `"#ia"`), remove hashtag duplicada
  (`#IA` e `#ia`), corta em 5 hashtags, aceita hashtags como string `"#a, #b c"`;
- `normalizeContent({})` não lança erro e `validateContent` do resultado lista vários erros.

`shared/json.test.js`:
- JSON puro; JSON dentro de ```json … ```; JSON com texto antes e depois; texto sem `{` → lança erro com mensagem em português.

`shared/prompt.test.js`:
- `buildPrompt` contém o tema, o número de slides e o link de cada item;
- `buildPrompt` com `useWebSearch: true` contém o `JSON_SHAPE`; com `false`, não contém;
- `buildAssistedPrompt` sempre contém o `JSON_SHAPE` e as `feedUrls`;
- `buildFixPrompt(['a','b'])` contém `a` e `b`.

Apague `shared/smoke.test.js`.

## Verificação (rode e mostre a saída)
1. `npm test` → todos verdes (deve passar de 20 testes).
2. `node -e "import('./shared/schema.js').then(async m => { const fs = await import('node:fs'); const c = JSON.parse(fs.readFileSync('shared/fixtures/exemplo.json','utf8')); console.log(m.validateContent(m.normalizeContent(c))); })"`
   → `valid: true`, `errors: []`, `warnings: []`.
3. Mostre o resultado de `buildPrompt` para o tema "Inteligência artificial na gestão pública", 5 slides, 2 itens falsos,
   `useWebSearch: false`.

## Validação humana
- Ler o prompt impresso no passo 3: regras completas? Tom certo? Português correto?
- Conferir que não há `window`, `document`, `process` ou `require` em `shared/`.

## Commit
```bash
git add -A
git commit -m "fase 1: contrato compartilhado (schema, validação, prompts, fixture)"
git tag fase-1
```

## Ao terminar
Marque as tarefas da F1 em `PROGRESSO.md`, resuma e PARE.
