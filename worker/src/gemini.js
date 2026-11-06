import {
  GEMINI_RESPONSE_SCHEMA,
  normalizeContent,
  validateContent,
} from '../../shared/schema.js';
import { extractJson } from '../../shared/json.js';
import { buildPrompt, buildFixPrompt } from '../../shared/prompt.js';

export class QuotaError extends Error {}
export class AiError extends Error {
  // detail: texto bruto do Gemini, só para log (pode conter ID do projeto Google).
  constructor(message, status, detail = '') {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}
export class AiOutputError extends Error {
  constructor(errors) {
    super('Resposta da IA inválida');
    this.errors = errors;
  }
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// O gemini-2.5-flash não aceita mais contas novas (HTTP 404). Use GEMINI_MODEL no wrangler.toml para trocar.
export const DEFAULT_MODEL = 'gemini-3.5-flash';
// Usado só quando o modelo principal está sobrecarregado (HTTP 503). GEMINI_FALLBACK_MODEL troca.
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

export async function callGemini({
  apiKey,
  model,
  contents,
  useWebSearch,
  responseSchema,
  retryDelayMs = 2000,
  fallbackModel,
}) {
  const generationConfig = { temperature: 0.4 };

  // D4: structured output + google_search não funciona em vários modelos. Com busca, pedimos JSON pelo prompt.
  if (!useWebSearch && responseSchema) {
    generationConfig.responseMimeType = 'application/json';
    generationConfig.responseSchema = responseSchema;
  }

  const body = { contents, generationConfig };
  if (useWebSearch) {
    body.tools = [{ google_search: {} }];
  }

  const request = (name) =>
    fetch(`${BASE}/${name}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

  let res = await request(model);
  // 503 = modelo sobrecarregado no momento: tenta mais uma vez e, se continuar, usa o modelo reserva.
  if (res.status === 503) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    res = await request(model);
  }
  if (res.status === 503 && fallbackModel && fallbackModel !== model) {
    console.warn(`[gemini] ${model} sobrecarregado; usando ${fallbackModel}`);
    res = await request(fallbackModel);
  }

  if (res.status === 429) {
    throw new QuotaError('Cota gratuita da IA esgotada por agora.');
  }

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    console.error(`[gemini] HTTP ${res.status}: ${detail}`);
    throw new AiError(`A IA respondeu com erro (HTTP ${res.status}). Tente de novo em instantes.`, res.status, detail);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text =
    candidate?.content?.parts?.map((p) => p.text || '').join('') ?? '';

  if (!text) {
    throw new AiError(
      `A IA não retornou texto (motivo: ${candidate?.finishReason || 'desconhecido'}).`,
      502,
    );
  }

  const grounding = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((chunk) => chunk.web)
    .filter(Boolean)
    .map((web) => ({ title: web.title || '', uri: web.uri || '' }));

  return { text, grounding };
}

/**
 * Gera o rascunho de carrossel chamando o Gemini com 1 retentativa automática em caso de erro no schema.
 */
export async function generateCarousel({
  env,
  theme,
  slideCount,
  tone,
  audience,
  visualFormat,
  items,
  sites,
  useWebSearch,
  retryDelayMs,
}) {
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbackModel = env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const apiKey = env.GEMINI_API_KEY;
  const warnings = [];
  let search = Boolean(useWebSearch);

  const promptFor = (withSearch) =>
    buildPrompt({ theme, slideCount, tone, audience, visualFormat, items, sites, useWebSearch: withSearch });

  let contents = [{ role: 'user', parts: [{ text: promptFor(search) }] }];

  let result;
  try {
    result = await callGemini({ apiKey, model, contents, useWebSearch: search, responseSchema: GEMINI_RESPONSE_SCHEMA, retryDelayMs, fallbackModel });
  } catch (err) {
    // No plano gratuito a busca na web (grounding) tem cota própria, bem menor. Se ela acabar e houver
    // itens de feed, gera só com os feeds em vez de mandar a pessoa para o modo assistido.
    if (!(err instanceof QuotaError) || !search || !items?.length) throw err;
    search = false;
    warnings.push('A busca na web não está disponível agora (cota do plano gratuito). O carrossel usou só os feeds.');
    contents = [{ role: 'user', parts: [{ text: promptFor(false) }] }];
    result = await callGemini({ apiKey, model, contents, useWebSearch: false, responseSchema: GEMINI_RESPONSE_SCHEMA, retryDelayMs, fallbackModel });
  }

  let totalGrounding = [...result.grounding];

  let parsedJson = null;
  let validationErrors = [];

  try {
    parsedJson = extractJson(result.text);
  } catch (err) {
    validationErrors = [err.message];
  }

  if (parsedJson) {
    const normalized = normalizeContent(parsedJson);
    const validation = validateContent(normalized);
    if (validation.valid) {
      return {
        content: normalized,
        warnings: [...warnings, ...validation.warnings],
        grounding: totalGrounding,
      };
    }
    validationErrors = validation.errors;
  }

  // Se chegou aqui, houve erro de extração ou validação. Executa 1 retry:
  const fixPrompt = buildFixPrompt(validationErrors);
  contents.push({
    role: 'model',
    parts: [{ text: result.text }],
  });
  contents.push({
    role: 'user',
    parts: [{ text: fixPrompt }],
  });

  const retryResult = await callGemini({
    apiKey,
    model,
    contents,
    useWebSearch: search,
    responseSchema: GEMINI_RESPONSE_SCHEMA,
    retryDelayMs,
    fallbackModel,
  });

  totalGrounding.push(...retryResult.grounding);

  try {
    const retryJson = extractJson(retryResult.text);
    const retryNormalized = normalizeContent(retryJson);
    const retryValidation = validateContent(retryNormalized);

    if (!retryValidation.valid) {
      throw new AiOutputError(retryValidation.errors);
    }

    return {
      content: retryNormalized,
      warnings: [...warnings, ...retryValidation.warnings],
      grounding: totalGrounding,
    };
  } catch (err) {
    if (err instanceof AiOutputError) throw err;
    throw new AiOutputError([err.message]);
  }
}
