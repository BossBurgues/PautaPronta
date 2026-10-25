/**
 * Valida o cabeçalho Authorization Bearer com o token de acesso.
 */
export function checkToken(c) {
  const token = c.env?.ACCESS_TOKEN;
  if (!token || typeof token !== 'string' || token.length < 16) {
    return false;
  }

  const authHeader = c.req.header('Authorization') || '';
  return safeEqual(authHeader, `Bearer ${token}`);
}

/**
 * Compara strings sem sair no primeiro caractere diferente (evita ataque de tempo).
 */
export function safeEqual(a, b) {
  const x = String(a);
  const y = String(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Retorna a chave do dia no formato usage:AAAA-MM-DD com base no horário de Brasília (UTC-3).
 */
export function todayKey() {
  const brasiliaDate = new Date(Date.now() - 3 * 3600 * 1000);
  return `usage:${brasiliaDate.toISOString().slice(0, 10)}`;
}

/**
 * Obtém a quantidade de gerações já realizadas hoje a partir do Cloudflare KV.
 */
export async function getUsage(env) {
  if (!env?.KV) return 0;
  try {
    const key = todayKey();
    const val = await env.KV.get(key);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch (err) {
    console.warn('[limits] Erro ao ler KV:', err);
    return 0;
  }
}

/**
 * Incrementa o contador de uso do dia no Cloudflare KV (TTL 48h = 172800s).
 */
export async function incrementUsage(env) {
  if (!env?.KV) return 1;
  try {
    const key = todayKey();
    const current = await getUsage(env);
    const next = current + 1;
    await env.KV.put(key, String(next), { expirationTtl: 172800 });
    return next;
  } catch (err) {
    console.warn('[limits] Erro ao gravar KV:', err);
    return 1;
  }
}

/**
 * Verifica se a cota diária de gerações foi atingida.
 */
export async function isOverLimit(env) {
  const usage = await getUsage(env);
  const limit = Number(env?.DAILY_LIMIT || 20);
  return usage >= limit;
}
