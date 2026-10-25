import { describe, it, expect } from 'vitest';
import { patchSlide, setField, insertSlide, deleteSlide } from './draftOps.js';
import fixture from '../../../shared/fixtures/exemplo.json';

describe('draftOps', () => {
  it('mantém espaço no fim do título enquanto o usuário digita', () => {
    const next = patchSlide(fixture, 1, { title: 'O que é ' });
    expect(next.slides[1].title).toBe('O que é ');
  });

  it('mantém quebra de linha no fim da legenda', () => {
    const next = setField(fixture, 'caption_instagram', 'Linha 1\n');
    expect(next.caption_instagram).toBe('Linha 1\n');
  });

  it('permite adicionar fonte vazia e apagar a URL sem perder a linha', () => {
    const withEmpty = setField(fixture, 'sources', [...fixture.sources, { title: '', url: '' }]);
    expect(withEmpty.sources).toHaveLength(3);
    const cleared = setField(fixture, 'sources', [{ ...fixture.sources[0], url: '' }, fixture.sources[1]]);
    expect(cleared.sources).toHaveLength(2);
    expect(cleared.sources[0].url).toBe('');
  });

  it('normaliza hashtags vindas como texto', () => {
    const next = setField(fixture, 'hashtags', 'ia #IA inovacao gestao');
    expect(next.hashtags).toEqual(['#ia', '#inovacao', '#gestao']);
  });

  it('insere slide antes da conclusão e renumera; respeita 7 slides', () => {
    const next = insertSlide(fixture);
    expect(next.slides).toHaveLength(6);
    expect(next.slides[4].role).toBe('ponto');
    expect(next.slides[5].role).toBe('conclusao');
    expect(next.slides.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(insertSlide(insertSlide(next)).slides).toHaveLength(7);
  });

  it('remove slide e renumera; respeita 4 slides', () => {
    const next = deleteSlide(fixture, 2);
    expect(next.slides.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    expect(deleteSlide(next, 0).slides).toHaveLength(4);
  });

  it('não altera o objeto original', () => {
    const before = JSON.stringify(fixture);
    patchSlide(fixture, 0, { title: 'x' });
    insertSlide(fixture);
    expect(JSON.stringify(fixture)).toBe(before);
  });
});
