import {
  GEMINI_RESPONSE_SCHEMA,
  normalizeContent,
  validateContent,
} from '../../shared/schema.js';
import { extractJson } from '../../shared/json.js';
import { buildPrompt, buildFixPrompt } from '../../shared/prompt.js';

export class QuotaError extends Error {}
export class AiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export class AiOutputError extends Error {
  constructor(errors) {
    super('Resposta da IA inválida');
    this.errors = errors;
  }
}

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function callGemini({
  apiKey,
  model,
  contents,
  useWebSearch,
  responseSchema,
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

  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 429) {
    throw new QuotaError('Cota gratuita da IA esgotada por agora.');
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new AiError(
      `Gemini respondeu ${res.status}: ${detail.slice(0, 300)}`,
      res.status,
    );
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
  items,
  useWebSearch,
}) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const apiKey = env.GEMINI_API_KEY;

  const prompt = buildPrompt({
    theme,
    slideCount,
    tone,
    items,
    useWebSearch,
  });

  const contents = [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  let result = await callGemini({
    apiKey,
    model,
    contents,
    useWebSearch,
    responseSchema: GEMINI_RESPONSE_SCHEMA,
  });

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
        warnings: validation.warnings,
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
    useWebSearch,
    responseSchema: GEMINI_RESPONSE_SCHEMA,
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
      warnings: retryValidation.warnings,
      grounding: totalGrounding,
    };
  } catch (err) {
    if (err instanceof AiOutputError) throw err;
    throw new AiOutputError([err.message]);
  }
}
