export class ApiError extends Error {
  constructor({
    status = 500,
    code = 'unknown',
    message = 'Erro na requisição.',
    fallbackToAssisted = false,
    errors = [],
  } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fallbackToAssisted = fallbackToAssisted;
    this.errors = errors;
  }
}

function getFriendlyMessage(code, defaultMsg) {
  if (code === 'unauthorized') {
    return 'Token inválido. Confira na aba Config.';
  }
  if (code === 'quota' || code === 'daily_limit') {
    return 'A cota gratuita acabou por hoje. Use o modo assistido — funciona igual e sem custo.';
  }
  if (code === 'invalid_ai_output') {
    return 'A IA respondeu fora do formato. Tente de novo ou use o modo assistido.';
  }
  if (code === 'network') {
    return 'Sem conexão com o servidor. Use o modo assistido.';
  }
  return defaultMsg || 'Erro inesperado na comunicação com o servidor.';
}

/**
 * Executa requisição HTTP autenticada contra a API do Worker.
 */
export async function request(
  config,
  path,
  { method = 'GET', body = null, timeoutMs = 90000 } = {},
) {
  const baseUrl = (config?.apiUrl || 'http://localhost:8787').replace(/\/+$/, '');
  const url = `${baseUrl}${path}`;

  const headers = {};
  if (config?.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }

  if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new ApiError({
      status: 0,
      code: 'network',
      fallbackToAssisted: true,
      message: getFriendlyMessage('network'),
    });
  } finally {
    clearTimeout(timer);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok || data.ok === false) {
    const code = data.error || (res.status === 401 ? 'unauthorized' : 'api_error');
    const msg = getFriendlyMessage(code, data.message);
    const fallbackToAssisted = Boolean(
      data.fallbackToAssisted || res.status === 429 || res.status === 502,
    );

    throw new ApiError({
      status: res.status,
      code,
      message: msg,
      fallbackToAssisted,
      errors: Array.isArray(data.errors) ? data.errors : [],
    });
  }

  return data;
}

/**
 * Chama o endpoint POST /api/generate.
 */
export async function generate(
  config,
  { theme, slideCount = 5, formats = ['linkedin', 'instagram'], useWebSearch = false, tone = 'profissional-didatico' },
) {
  const feeds = Array.isArray(config?.feeds) ? config.feeds : [];
  const sources = feeds.filter((f) => f.enabled).map((f) => f.url);

  return request(config, '/api/generate', {
    method: 'POST',
    body: {
      theme,
      slideCount,
      formats,
      useWebSearch,
      tone,
      sources,
    },
  });
}

/**
 * Chama o endpoint GET /api/health para testar a conexão com o Worker.
 */
export async function health(config) {
  return request(config, '/api/health', {
    method: 'GET',
    timeoutMs: 10000,
  });
}

/**
 * Busca as sugestões semanais armazenadas no Worker (GET /api/suggestions).
 */
export async function getSuggestions(config) {
  return request(config, '/api/suggestions', {
    method: 'GET',
    timeoutMs: 15000,
  });
}

/**
 * Solicita nova geração de sugestões semanais sob demanda (POST /api/suggestions/run).
 * Conta como 1 geração na cota diária.
 */
export async function runSuggestions(config) {
  return request(config, '/api/suggestions/run', {
    method: 'POST',
    timeoutMs: 90000,
  });
}
