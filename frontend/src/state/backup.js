// Backup dos dados que só existem no navegador (ideias, histórico, configuração).
// O token de acesso NUNCA vai para o arquivo: ele dá acesso à API e o backup pode ser compartilhado.

export const BACKUP_APP = 'pauta-pronta';
export const BACKUP_VERSION = 1;
const MAX_HISTORY = 20;

export function buildBackup({ config, ideas, history }, now = new Date()) {
  const { token, ...configSemToken } = config || {};
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    config: configSemToken,
    ideas: Array.isArray(ideas) ? ideas : [],
    history: Array.isArray(history) ? history : [],
  };
}

export function backupFilename(now = new Date()) {
  return `pauta-pronta-backup-${now.toISOString().slice(0, 10)}.json`;
}

// Lê o texto de um arquivo de backup. Lança Error com mensagem em português se não for válido.
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  if (!data || data.app !== BACKUP_APP) {
    throw new Error('Este arquivo não é um backup do Pauta Pronta.');
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error(`Versão de backup não suportada (${data.version}).`);
  }

  const config = data.config && typeof data.config === 'object' ? data.config : {};
  delete config.token; // mesmo que alguém edite o arquivo, o token atual não é substituído

  const ideas = (Array.isArray(data.ideas) ? data.ideas : []).filter(
    (idea) => idea && typeof idea.id === 'string' && typeof idea.theme === 'string',
  );
  const history = (Array.isArray(data.history) ? data.history : [])
    .filter((entry) => entry && typeof entry.id === 'string' && entry.content && typeof entry.content === 'object')
    .slice(0, MAX_HISTORY);

  return { config, ideas, history };
}
