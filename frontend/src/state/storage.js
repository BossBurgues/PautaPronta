const PREFIX = 'pp:';

/**
 * Carrega e faz parse de um item do localStorage pelo nome da chave.
 * Retorna o fallback caso a chave não exista ou o valor seja inválido.
 *
 * @param {string} key
 * @param {any} fallback
 * @returns {any}
 */
export function load(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[storage] Erro ao carregar a chave "${key}":`, error);
    return fallback;
  }
}

/**
 * Salva um valor no localStorage após serializá-lo em JSON.
 * Retorna false se o salvamento falhar (ex.: QuotaExceededError).
 *
 * @param {string} key
 * @param {any} value
 * @returns {boolean}
 */
export function save(key, value) {
  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(PREFIX + key, serialized);
    return true;
  } catch (error) {
    console.warn(`[storage] Erro ao salvar a chave "${key}":`, error);
    return false;
  }
}
