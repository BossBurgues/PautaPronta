import { describe, it, expect } from 'vitest';
import { slugify, buildCaption } from './exporters.js';
import fixture from '../../../shared/fixtures/exemplo.json';

describe('canvas/exporters', () => {
  it('slugify converte texto para formato seguro de arquivo', () => {
    const slug = slugify('Inteligência Artificial: o que muda?');
    expect(slug).toBe('inteligencia-artificial-o-que-muda');
  });

  it('slugify limita o tamanho a 40 caracteres e remove hífens finais', () => {
    const long = 'Um tema extremamente longo com mais de quarenta caracteres que deve ser encurtado';
    const slug = slugify(long);
    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('buildCaption para linkedin inclui legenda, CTA, hashtags e as fontes citadas com URLs', () => {
    const caption = buildCaption(fixture, 'linkedin');

    expect(caption).toContain(fixture.caption_linkedin);
    expect(caption).toContain(fixture.cta);
    expect(caption).toContain('#LGPD');
    expect(caption).toContain('#ProtecaoDeDados');
    expect(caption).toContain('Fontes:');
    expect(caption).toContain('https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm');
    expect(caption).toContain('https://www.gov.br/anpd/pt-br');
  });

  it('buildCaption para instagram inclui legenda, CTA e hashtags, mas não contém fontes', () => {
    const caption = buildCaption(fixture, 'instagram');

    expect(caption).toContain(fixture.caption_instagram);
    expect(caption).toContain(fixture.cta);
    expect(caption).toContain('#LGPD');
    expect(caption).not.toContain('Fontes:');
    expect(caption).not.toContain('https://www.planalto.gov.br');
  });
});
