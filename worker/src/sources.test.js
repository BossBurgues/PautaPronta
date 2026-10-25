import { describe, it, expect } from 'vitest';
import { hostOf, verifySources, buildUsedSources } from './sources.js';

describe('worker/sources', () => {
  it('hostOf limpa URLs e remove prefixo www', () => {
    expect(hostOf('https://www.planalto.gov.br/ccivil/lei.htm')).toBe('planalto.gov.br');
    expect(hostOf('http://technologyreview.com/feed')).toBe('technologyreview.com');
    expect(hostOf('invalido')).toBe('');
  });

  it('verifica fonte quando o host bate com item do RSS', () => {
    const sources = [{ title: 'Artigo', url: 'https://exemplo.com/artigo-1' }];
    const items = [{ title: 'Notícia', link: 'https://www.exemplo.com/feed-noticia' }];
    const verified = verifySources(sources, { items, grounding: [] });

    expect(verified[0].verified).toBe(true);
  });

  it('verifica fonte quando o host bate com título do grounding', () => {
    const sources = [{ title: 'Tech News', url: 'https://mit.edu/research/ai' }];
    const grounding = [{ title: 'mit.edu: Latest Research', uri: 'https://vertexaisearch.cloud.google.com/123' }];
    const verified = verifySources(sources, { items: [], grounding });

    expect(verified[0].verified).toBe(true);
  });

  it('verifica fonte quando o host bate com URI do grounding', () => {
    const sources = [{ title: 'ANPD Gov', url: 'https://www.gov.br/anpd/pt-br' }];
    const grounding = [{ title: 'ANPD', uri: 'https://gov.br/noticias' }];
    const verified = verifySources(sources, { items: [], grounding });

    expect(verified[0].verified).toBe(true);
  });

  it('marca verified: false para fonte sem correspondência em feeds nem grounding', () => {
    const sources = [{ title: 'Fonte Desconhecida', url: 'https://desconhecido.xyz/post' }];
    const items = [{ title: 'Notícia', link: 'https://siteconfiavel.com/noticia' }];
    const grounding = [{ title: 'Outro Site', uri: 'https://outro.org/artigo' }];
    const verified = verifySources(sources, { items, grounding });

    expect(verified[0].verified).toBe(false);
  });

  it('buildUsedSources combina itens e grounding sem duplicar URLs', () => {
    const items = [{ title: 'Item 1', link: 'https://fonte.com/1' }];
    const grounding = [
      { title: 'Item 1 Repetido', uri: 'https://fonte.com/1' },
      { title: 'Item 2 Grounding', uri: 'https://fonte.com/2' },
      { title: 'gov.br', uri: 'https://vertexaisearch.cloud.google.com/redirect' },
      { title: 'Perigoso', uri: 'javascript:alert(1)' },
    ];

    const used = buildUsedSources(items, grounding);
    expect(used).toHaveLength(3);
    expect(used[0].url).toBe('https://fonte.com/1');
    expect(used[1].url).toBe('https://fonte.com/2');
    expect(used[2]).toEqual({ title: 'gov.br', url: 'https://vertexaisearch.cloud.google.com/redirect' });
  });

  it('não verifica domínio que só termina com o mesmo texto (netflix.com x x.com)', () => {
    const sources = [{ title: 'Falsa', url: 'https://netflix.com/a' }];
    const grounding = [{ title: 'x.com', uri: 'https://vertexaisearch.cloud.google.com/1' }];
    expect(verifySources(sources, { items: [], grounding })[0].verified).toBe(false);
  });

  it('verifica subdomínio do domínio citado no grounding', () => {
    const sources = [{ title: 'ANPD', url: 'https://www.gov.br/anpd' }];
    const grounding = [{ title: 'gov.br', uri: 'https://vertexaisearch.cloud.google.com/1' }];
    expect(verifySources(sources, { items: [], grounding })[0].verified).toBe(true);
  });
});
