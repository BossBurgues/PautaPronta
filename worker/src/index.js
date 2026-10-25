import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { normalizeContent, validateContent } from '../../shared/schema.js';
import { extractJson } from '../../shared/json.js';
import { fetchFeeds } from './rss.js';
import {
  generateCarousel,
  QuotaError,
  AiError,
  AiOutputError,
} from './gemini.js';
import { verifySources, buildUsedSources } from './sources.js';
import { checkToken, isOverLimit, incrementUsage } from './limits.js';
import { runWeekly } from './suggestions.js';

const app = new Hono();

app.use('/api/*', (c, next) =>
  cors({
    origin: (c.env.ALLOWED_ORIGIN || '').split(',').map((s) => s.trim()),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })(c, next),
);

function fail(c, status, error, message, extra = {}) {
  return c.json({ ok: false, error, message, ...extra }, status);
}

app.get('/api/health', (c) =>
  c.json({ ok: true, service: 'pauta-pronta-api' }),
);

app.post('/api/generate', async (c) => {
  // 1. Verificação de configuração do servidor
  if (!c.env?.GEMINI_API_KEY || !c.env?.ACCESS_TOKEN) {
    return fail(
      c,
      500,
      'config',
      'Servidor sem configuração. Veja docs/SETUP_CONTAS.md',
    );
  }

  // 2. Validação do Token
  if (!checkToken(c)) {
    return fail(c, 401, 'unauthorized', 'Token de acesso inválido ou ausente.');
  }

  // 3. Validação do Body
  let body = {};
  try {
    body = await c.req.json();
  } catch {
    return fail(c, 400, 'bad_request', 'Corpo da requisição JSON inválido.');
  }

  const theme = typeof body.theme === 'string' ? body.theme.trim() : '';
  if (theme.length < 3 || theme.length > 200) {
    return fail(
      c,
      400,
      'bad_request',
      'O tema deve ser um texto entre 3 e 200 caracteres.',
    );
  }

  const slideCount = Number(body.slideCount || 5);
  if (!Number.isInteger(slideCount) || slideCount < 4 || slideCount > 7) {
    return fail(
      c,
      400,
      'bad_request',
      'A quantidade de slides deve ser um número inteiro entre 4 e 7.',
    );
  }

  const tone = body.tone || 'profissional-didatico';
  const useWebSearch = Boolean(body.useWebSearch);

  const rawSources = Array.isArray(body.sources) ? body.sources : [];
  const validSources = rawSources
    .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
    .slice(0, 8);

  if (validSources.length === 0 && !useWebSearch) {
    return fail(
      c,
      400,
      'bad_request',
      'Ative a busca na web ou cadastre ao menos um feed RSS.',
    );
  }

  // 4. Verificação de limite diário
  if (await isOverLimit(c.env)) {
    return fail(
      c,
      429,
      'daily_limit',
      'Limite diário de gerações atingido.',
      { fallbackToAssisted: true },
    );
  }

  // 5. Execução do fluxo: feeds -> Gemini -> verificação
  try {
    const feedResult = await fetchFeeds(validSources);

    const carousel = await generateCarousel({
      env: c.env,
      theme,
      slideCount,
      tone,
      items: feedResult.items,
      useWebSearch,
    });

    const verifiedSources = verifySources(carousel.content.sources, {
      items: feedResult.items,
      grounding: carousel.grounding,
    });

    const finalContent = {
      ...carousel.content,
      sources: verifiedSources,
    };

    await incrementUsage(c.env);

    return c.json({
      ok: true,
      content: finalContent,
      warnings: carousel.warnings,
      usedSources: buildUsedSources(feedResult.items, carousel.grounding),
      feedErrors: feedResult.errors,
      model: c.env.GEMINI_MODEL || 'gemini-2.5-flash',
    });
  } catch (err) {
    if (err instanceof QuotaError) {
      return fail(c, 429, 'quota', err.message, { fallbackToAssisted: true });
    }

    if (err instanceof AiOutputError) {
      return fail(
        c,
        422,
        'invalid_ai_output',
        'A IA não gerou uma resposta válida após retentativa.',
        { errors: err.errors, fallbackToAssisted: true },
      );
    }

    if (err instanceof AiError) {
      let msg = err.message;
      if (err.status === 400 && /API key/i.test(err.message)) {
        msg = 'Chave do Gemini inválida. Confira o .dev.vars / secret.';
      }
      return fail(c, 502, 'ai_error', msg, { fallbackToAssisted: true });
    }

    console.error('[worker:generate] Erro inesperado:', err.message || err);
    return fail(c, 500, 'internal', 'Erro inesperado.');
  }
});

app.post('/api/assisted-parse', async (c) => {
  if (!checkToken(c)) {
    return fail(c, 401, 'unauthorized', 'Token de acesso inválido ou ausente.');
  }

  let body = {};
  try {
    body = await c.req.json();
  } catch {
    return fail(c, 400, 'bad_request', 'Corpo JSON inválido.');
  }

  let rawData = null;

  if (typeof body.text === 'string') {
    try {
      rawData = extractJson(body.text);
    } catch (err) {
      return fail(c, 422, 'invalid_json', err.message);
    }
  } else if (body.content && typeof body.content === 'object') {
    rawData = body.content;
  } else {
    return fail(
      c,
      400,
      'bad_request',
      'Envie o campo "text" (texto colado) ou "content" (objeto).',
    );
  }

  const normalized = normalizeContent(rawData);

  // No modo assistido, todas as fontes iniciam com verified: false para checagem manual
  const contentWithUnverifiedSources = {
    ...normalized,
    sources: (normalized.sources || []).map((s) => ({
      ...s,
      verified: false,
    })),
  };

  const validation = validateContent(contentWithUnverifiedSources);

  if (!validation.valid) {
    return c.json(
      {
        ok: false,
        error: 'invalid_content',
        errors: validation.errors,
        warnings: validation.warnings,
      },
      422,
    );
  }

  return c.json({
    ok: true,
    content: contentWithUnverifiedSources,
    warnings: validation.warnings,
  });
});

app.get('/api/suggestions', async (c) => {
  if (!checkToken(c)) {
    return fail(c, 401, 'unauthorized', 'Token de acesso inválido ou ausente.');
  }

  if (!c.env?.KV) {
    return c.json({ ok: true, generatedAt: null, suggestions: [] });
  }

  try {
    const raw = await c.env.KV.get('weekly_draft');
    if (!raw) {
      return c.json({ ok: true, generatedAt: null, suggestions: [] });
    }
    const parsed = JSON.parse(raw);
    return c.json({
      ok: true,
      generatedAt: parsed.generatedAt || null,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    });
  } catch (err) {
    console.warn('[worker:suggestions] Erro ao ler weekly_draft do KV:', err);
    return c.json({ ok: true, generatedAt: null, suggestions: [] });
  }
});

app.post('/api/suggestions/run', async (c) => {
  if (!c.env?.GEMINI_API_KEY || !c.env?.ACCESS_TOKEN) {
    return fail(
      c,
      500,
      'config',
      'Servidor sem configuração. Veja docs/SETUP_CONTAS.md',
    );
  }

  if (!checkToken(c)) {
    return fail(c, 401, 'unauthorized', 'Token de acesso inválido ou ausente.');
  }

  if (await isOverLimit(c.env)) {
    return fail(
      c,
      429,
      'daily_limit',
      'Limite diário de gerações atingido.',
      { fallbackToAssisted: true },
    );
  }

  try {
    const result = await runWeekly(c.env, { throwOnError: true });
    await incrementUsage(c.env);

    return c.json({
      ok: true,
      generatedAt: result?.generatedAt || null,
      suggestions: result?.suggestions || [],
    });
  } catch (err) {
    if (err instanceof QuotaError) {
      return fail(c, 429, 'quota', err.message, { fallbackToAssisted: true });
    }

    if (err instanceof AiOutputError) {
      return fail(
        c,
        422,
        'invalid_ai_output',
        'A IA não gerou sugestões válidas após retentativa.',
        { errors: err.errors, fallbackToAssisted: true },
      );
    }

    if (err instanceof AiError) {
      let msg = err.message;
      if (err.status === 400 && /API key/i.test(err.message)) {
        msg = 'Chave do Gemini inválida. Confira o .dev.vars / secret.';
      }
      return fail(c, 502, 'ai_error', msg, { fallbackToAssisted: true });
    }

    console.error('[worker:suggestions:run] Erro inesperado:', err.message || err);
    return fail(c, 500, 'internal', 'Erro inesperado.');
  }
});

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    if (ctx && typeof ctx.waitUntil === 'function') {
      ctx.waitUntil(runWeekly(env));
    } else {
      await runWeekly(env);
    }
  },
};
