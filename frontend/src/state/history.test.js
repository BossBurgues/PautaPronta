import { describe, it, expect } from 'vitest';
import { pushHistory, MAX_HISTORY } from './useHistory.js';

describe('pushHistory', () => {
  it('coloca o novo item no início da lista e não muta a lista original', () => {
    const initial = [{ id: '1', theme: 'Antigo' }];
    const entry = { id: '2', theme: 'Novo' };

    const updated = pushHistory(initial, entry);

    expect(updated).toHaveLength(2);
    expect(updated[0]).toEqual(entry);
    expect(updated[1]).toEqual(initial[0]);
    expect(initial).toHaveLength(1);
  });

  it('mantém no máximo 20 itens (padrão) descartando os mais antigos', () => {
    const existing = Array.from({ length: 20 }, (_, i) => ({
      id: `item-${i + 1}`,
      theme: `Tema ${i + 1}`,
    }));

    const newest = { id: 'item-novo', theme: 'Tema Mais Recente' };
    const updated = pushHistory(existing, newest);

    expect(updated).toHaveLength(MAX_HISTORY);
    expect(updated).toHaveLength(20);
    expect(updated[0]).toEqual(newest);
    expect(updated[19].id).toBe('item-19');
    expect(updated.find((x) => x.id === 'item-20')).toBeUndefined();
  });

  it('respeita um limite customizado quando informado', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const updated = pushHistory(list, { id: 'd' }, 3);
    expect(updated.map((x) => x.id)).toEqual(['d', 'a', 'b']);
  });
});
