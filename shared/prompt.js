export const RULES = `Regras obrigatórias:
- Use SOMENTE informação presente nas fontes fornecidas/pesquisadas. Não invente dados.
- Cite ao menos 2 fontes, com título e URL reais retornados pela busca.
- Tom: profissional e tecnicamente consistente, porém didático e acessível. Nem acadêmico demais, nem informal.
- NÃO faça afirmações sem fonte. NÃO trate tendência/hipótese como fato consolidado.
- Proibido: conteúdo político-partidário, polêmico fora do tema, sensacionalista ou comercial/autopromocional.
- CTA final deve ser uma pergunta natural relacionada ao tema (ex.: "Como sua empresa lida com isso?"), nunca uma chamada de venda.
- Legenda do LinkedIn: mais analítica e contextualizada. Legenda do Instagram: mais direta e visual.
- 3 a 5 hashtags relevantes.
- Responda ESTRITAMENTE no schema JSON definido. Sem texto fora do JSON.
- Título de cada slide com no máximo 60 caracteres; corpo com no máximo 220 caracteres.
- O primeiro slide tem role 'capa', o último 'conclusao', o segundo 'contexto' e os demais 'ponto'.
- Escreva em português do Brasil.`;

export const JSON_SHAPE = `{
  "topic": "string",
  "slides": [
    { "n": 1, "role": "capa", "title": "string", "body": "string" },
    { "n": 2, "role": "contexto", "title": "string", "body": "string" },
    { "n": 3, "role": "ponto", "title": "string", "body": "string" },
    { "n": 4, "role": "ponto", "title": "string", "body": "string" },
    { "n": 5, "role": "conclusao", "title": "string", "body": "string" }
  ],
  "caption_linkedin": "string",
  "caption_instagram": "string",
  "hashtags": ["#string", "#string", "#string"],
  "cta": "string?",
  "sources": [
    { "title": "string", "url": "https://..." },
    { "title": "string", "url": "https://..." }
  ]
}`;

export const GEMINI_SUGGESTIONS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    suggestions: {
      type: 'ARRAY',
      minItems: 2,
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: {
          theme: { type: 'STRING' },
          angle: { type: 'STRING' },
          sources: {
            type: 'ARRAY',
            minItems: 1,
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                url: { type: 'STRING' },
              },
              required: ['title', 'url'],
            },
          },
        },
        required: ['theme', 'angle', 'sources'],
      },
    },
  },
  required: ['suggestions'],
};

/**
 * Mapeia identificador de tom para descrição textual.
 */
function formatTone(tone) {
  if (tone === 'profissional-didatico') return 'profissional e didático';
  if (tone === 'direto-pratico') return 'direto e prático';
  return tone || 'profissional e didático';
}

/**
 * Constrói o prompt padrão para a chamada do Worker ao Gemini.
 */
export function buildPrompt({
  theme,
  slideCount = 5,
  tone = 'profissional-didatico',
  items = [],
  useWebSearch = false,
}) {
  const toneDesc = formatTone(tone);

  let sourcesText = 'Nenhum feed fornecido; use apenas a busca na web.';
  if (Array.isArray(items) && items.length > 0) {
    sourcesText = items
      .map((item) => `- ${item.title || ''} — ${item.summary || ''} (${item.link || ''})`)
      .join('\n');
  }

  let prompt = `Você é um assistente de criação de conteúdo técnico para redes profissionais (LinkedIn e Instagram).
A partir do TEMA e das FONTES fornecidas, produza um carrossel.

${RULES}

Tom desejado: ${toneDesc}.

TEMA: ${theme}
SLIDES: ${slideCount}
FONTES:
${sourcesText}`;

  if (useWebSearch) {
    prompt += `\n\nPesquise na web em fontes confiáveis e cite as URLs reais encontradas.
Responda com um único objeto JSON neste formato, sem texto antes ou depois:
${JSON_SHAPE}`;
  }

  return prompt;
}

/**
 * Constrói o prompt para o Modo Assistido (copiar e colar em assistente de IA externo).
 */
export function buildAssistedPrompt({
  theme,
  slideCount = 5,
  tone = 'profissional-didatico',
  feedUrls = [],
}) {
  const toneDesc = formatTone(tone);

  let researchInstruction = 'Pesquise na web sobre o tema em fontes confiáveis.';
  if (Array.isArray(feedUrls) && feedUrls.length > 0) {
    researchInstruction = `Pesquise na web sobre o tema em fontes confiáveis. Você pode usar estes links/fontes como ponto de partida:\n${feedUrls
      .map((u) => `- ${u}`)
      .join('\n')}`;
  }

  return `Você vai me ajudar a criar um carrossel.

${researchInstruction}

${RULES}

Tom desejado: ${toneDesc}.

TEMA: ${theme}
SLIDES: ${slideCount}

Responda SOMENTE com um bloco de código \`\`\`json
${JSON_SHAPE}
\`\`\``;
}

/**
 * Constrói o prompt de correção quando a validação detecta problemas.
 */
export function buildFixPrompt(errors) {
  const list = Array.isArray(errors) ? errors.map((e) => `- ${e}`).join('\n') : `- ${errors}`;
  return `Sua resposta anterior tem estes problemas:
${list}

Corrija e responda somente com o objeto JSON completo, no mesmo formato.`;
}

/**
 * Constrói o prompt para sugestões semanais do cron trigger.
 */
export function buildSuggestionsPrompt({ topics = '', items = [] }) {
  let sourcesText = 'Nenhum feed específico fornecido; utilize as notícias mais relevantes da semana.';
  if (Array.isArray(items) && items.length > 0) {
    sourcesText = items
      .map((item) => `- ${item.title || ''} (${item.link || ''})`)
      .join('\n');
  }

  return `Você é um curador e estrategista de conteúdo para LinkedIn e Instagram.
Gere 3 sugestões de pauta para a semana nos seguintes tópicos de interesse: ${topics}.

Baseie-se nestes itens recentes e na web:
${sourcesText}

Regras:
- Use SOMENTE informação verídica. Não invente fontes.
- Proibido: conteúdo político-partidário, sensacionalista ou autopromocional.
- Escreva em português do Brasil.
- Cada sugestão deve conter:
  * theme: título ou tema do carrossel (no máximo 80 caracteres);
  * angle: por que é relevante agora e qual o ângulo abordado (no máximo 200 caracteres);
  * sources: ao menos 1 fonte real citada (título e URL).

Responda no formato especificado.`;
}
