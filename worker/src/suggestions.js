import { extractJson } from '../../shared/json.js';
import {
  buildSuggestionsPrompt,
  buildFixPrompt,
  GEMINI_SUGGESTIONS_SCHEMA,
} from '../../shared/prompt.js';
import { fetchFeeds } from './rss.js';
import { callGemini, AiOutputError } from './gemini.js';

/**
 * Valida e normaliza o objeto de sugestões retornado pela IA.
 * Aceita de 2 a 3 itens (corta excesso acima de 3).
 *
 * @param {any} obj
 * @returns {{ valid: boolean, errors: string[], suggestions: Array<{ theme: string, angle: string, sources: Array<{ title: string, url: string }> }> }}
 */
export function validateSuggestions(obj) {
  const errors = [];

  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.suggestions)) {
    return {
      valid: false,
      errors: ['O formato das sugestões é inválido: campo "suggestions" ausente ou não é uma lista.'],
      suggestions: [],
    };
  }

  const rawList = obj.suggestions.slice(0, 3);

  if (rawList.length < 2) {
    errors.push('A lista de sugestões deve conter entre 2 e 3 itens.');
  }

  const suggestions = rawList.map((item, idx) => {
    const num = idx + 1;
    const raw = item && typeof item === 'object' ? item : {};
    const theme = typeof raw.theme === 'string' ? raw.theme.trim() : '';
    const angle = typeof raw.angle === 'string' ? raw.angle.trim() : '';
    const rawSources = Array.isArray(raw.sources) ? raw.sources : [];

    if (theme.length < 3 || theme.length > 80) {
      errors.push(`Sugestão ${num}: o tema deve ter entre 3 e 80 caracteres.`);
    }

    if (angle.length === 0 || angle.length > 200) {
      errors.push(`Sugestão ${num}: o ângulo deve ter entre 1 e 200 caracteres.`);
    }

    const sources = rawSources.map((s) => ({
      title: typeof s?.title === 'string' ? s.title.trim() : '',
      url: typeof s?.url === 'string' ? s.url.trim() : '',
    }));

    if (sources.length < 1) {
      errors.push(`Sugestão ${num}: deve informar pelo menos 1 fonte.`);
    } else {
      for (const src of sources) {
        if (!/^https?:\/\/.+/i.test(src.url)) {
          errors.push(`Sugestão ${num}: fonte com URL inválida ("${src.url || 'vazia'}"). Use http:// ou https://.`);
        }
      }
    }

    return {
      theme,
      angle,
      sources,
    };
  });

  return {
    valid: errors.length === 0,
    errors,
    suggestions,
  };
}

/**
 * Executa a rotina semanal de curadoria de sugestões (via Cron ou sob demanda)
 * e grava em `weekly_draft` no Cloudflare KV se válida.
 *
 * @param {object} env
 * @param {{ throwOnError?: boolean }} [options]
 * @returns {Promise<{ generatedAt: string, suggestions: Array } | null>}
 */
export async function runWeekly(env, { throwOnError = false } = {}) {
  try {
    const feeds = (env?.DEFAULT_FEEDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const feedResult = await fetchFeeds(feeds, { maxItems: 10 });
    const items = feedResult.items || [];

    const prompt = buildSuggestionsPrompt({
      topics: env?.TOPICS || '',
      items,
    });

    const model = env?.GEMINI_MODEL || 'gemini-2.5-flash';
    const apiKey = env?.GEMINI_API_KEY;

    const contents = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const firstRes = await callGemini({
      apiKey,
      model,
      contents,
      useWebSearch: false,
      responseSchema: GEMINI_SUGGESTIONS_SCHEMA,
    });

    let validationErrors = [];
    let validSuggestions = null;

    try {
      const parsed = extractJson(firstRes.text);
      const check = validateSuggestions(parsed);
      if (check.valid) {
        validSuggestions = check.suggestions;
      } else {
        validationErrors = check.errors;
      }
    } catch (err) {
      validationErrors = [err.message];
    }

    if (!validSuggestions) {
      const fixPrompt = buildFixPrompt(validationErrors);
      contents.push({
        role: 'model',
        parts: [{ text: firstRes.text }],
      });
      contents.push({
        role: 'user',
        parts: [{ text: fixPrompt }],
      });

      const retryRes = await callGemini({
        apiKey,
        model,
        contents,
        useWebSearch: false,
        responseSchema: GEMINI_SUGGESTIONS_SCHEMA,
      });

      let retryErrors = [];
      try {
        const retryParsed = extractJson(retryRes.text);
        const retryCheck = validateSuggestions(retryParsed);
        if (retryCheck.valid) {
          validSuggestions = retryCheck.suggestions;
        } else {
          retryErrors = retryCheck.errors;
        }
      } catch (err) {
        retryErrors = [err.message];
      }

      if (!validSuggestions) {
        console.error('[suggestions] Sugestões inválidas após 1 retry:', retryErrors);
        if (throwOnError) {
          throw new AiOutputError(retryErrors);
        }
        return null;
      }
    }

    const payload = {
      generatedAt: new Date().toISOString(),
      suggestions: validSuggestions,
    };

    if (env?.KV) {
      await env.KV.put('weekly_draft', JSON.stringify(payload));
    }

    return payload;
  } catch (err) {
    console.error('[suggestions] Erro ao gerar sugestões semanais:', err.message || err);
    if (throwOnError) {
      throw err;
    }
    return null;
  }
}
