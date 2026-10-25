import { describe, it, expect } from 'vitest';
import { buildBackup, parseBackup, backupFilename } from './backup.js';
import fixture from '../../../shared/fixtures/exemplo.json';

const config = { apiUrl: 'https://api.exemplo.workers.dev', token: 'segredo-que-nao-pode-sair', feeds: [] };
const ideas = [{ id: 'i1', theme: 'LGPD', status: 'nova' }];
const history = [{ id: 'h1', theme: 'LGPD', content: fixture }];
const now = new Date('2026-10-25T12:00:00Z');

describe('backup', () => {
  it('nunca inclui o token no arquivo', () => {
    const backup = buildBackup({ config, ideas, history }, now);
    expect(JSON.stringify(backup)).not.toContain('segredo-que-nao-pode-sair');
    expect(backup.config.apiUrl).toBe(config.apiUrl);
  });

  it('ida e volta preserva ideias, histórico e configuração', () => {
    const text = JSON.stringify(buildBackup({ config, ideas, history }, now));
    const parsed = parseBackup(text);
    expect(parsed.ideas).toEqual(ideas);
    expect(parsed.history[0].content.topic).toBe(fixture.topic);
    expect(parsed.config.apiUrl).toBe(config.apiUrl);
  });

  it('ignora token colocado à mão no arquivo e itens malformados', () => {
    const text = JSON.stringify({
      app: 'pauta-pronta',
      version: 1,
      config: { token: 'trocado' },
      ideas: [{ id: 'ok', theme: 'x' }, { theme: 'sem id' }, null],
      history: [{ id: 'h', content: null }],
    });
    const parsed = parseBackup(text);
    expect(parsed.config.token).toBeUndefined();
    expect(parsed.ideas).toHaveLength(1);
    expect(parsed.history).toHaveLength(0);
  });

  it('recusa arquivo que não é backup, JSON inválido ou versão desconhecida', () => {
    expect(() => parseBackup('não é json')).toThrow('JSON válido');
    expect(() => parseBackup('{"app":"outro"}')).toThrow('não é um backup');
    expect(() => parseBackup('{"app":"pauta-pronta","version":9}')).toThrow('Versão');
  });

  it('nomeia o arquivo com a data', () => {
    expect(backupFilename(now)).toBe('pauta-pronta-backup-2026-10-25.json');
  });
});
