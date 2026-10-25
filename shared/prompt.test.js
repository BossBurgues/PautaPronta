import { describe, it, expect } from 'vitest';
import {
  RULES,
  JSON_SHAPE,
  buildPrompt,
  buildAssistedPrompt,
  buildFixPrompt,
  buildSuggestionsPrompt,
} from './prompt.js';

describe('shared/prompt', () => {
  const sampleItems = [
    {
      title: 'Notícia A',
      summary: 'Resumo da notícia A',
      link: 'https://fonte.com/noticia-a',
    },
    {
      title: 'Artigo B',
      summary: 'Resumo do artigo B',
      link: 'https://fonte.com/artigo-b',
    },
  ];

  it('buildPrompt contém o tema, o número de slides e o link de cada item', () => {
    const prompt = buildPrompt({
      theme: 'Governança em TI',
      slideCount: 6,
      tone: 'profissional-didatico',
      items: sampleItems,
      useWebSearch: false,
    });

    expect(prompt).toContain('TEMA: Governança em TI');
    expect(prompt).toContain('SLIDES: 6');
    expect(prompt).toContain('https://fonte.com/noticia-a');
    expect(prompt).toContain('https://fonte.com/artigo-b');
    expect(prompt).toContain('profissional e didático');
  });

  it('buildPrompt com useWebSearch: true contém JSON_SHAPE; com false não contém', () => {
    const promptWeb = buildPrompt({
      theme: 'Cloud Security',
      slideCount: 5,
      items: [],
      useWebSearch: true,
    });
    expect(promptWeb).toContain('Pesquise na web em fontes confiáveis');
    expect(promptWeb).toContain('"caption_linkedin": "string"');
    expect(promptWeb).toContain(JSON_SHAPE);

    const promptNoWeb = buildPrompt({
      theme: 'Cloud Security',
      slideCount: 5,
      items: sampleItems,
      useWebSearch: false,
    });
    expect(promptNoWeb).not.toContain(JSON_SHAPE);
    expect(promptNoWeb).not.toContain('Pesquise na web em fontes confiáveis');
  });

  it('buildAssistedPrompt sempre contém JSON_SHAPE e as feedUrls', () => {
    const feedUrls = ['https://feed.com/rss1', 'https://feed.com/rss2'];
    const assisted = buildAssistedPrompt({
      theme: 'Gestão de Projetos Ágeis',
      slideCount: 5,
      tone: 'direto-pratico',
      feedUrls,
    });

    expect(assisted).toContain('Você vai me ajudar a criar um carrossel.');
    expect(assisted).toContain('https://feed.com/rss1');
    expect(assisted).toContain('https://feed.com/rss2');
    expect(assisted).toContain('TEMA: Gestão de Projetos Ágeis');
    expect(assisted).toContain('SLIDES: 5');
    expect(assisted).toContain('Responda SOMENTE com um bloco de código ```json');
    expect(assisted).toContain(JSON_SHAPE);
  });

  it('buildFixPrompt inclui a lista de erros apontados', () => {
    const errors = [
      'Slide 2: título com 70 caracteres (máximo 60).',
      'Deve conter no mínimo 2 fontes.',
    ];
    const fixPrompt = buildFixPrompt(errors);

    expect(fixPrompt).toContain('Sua resposta anterior tem estes problemas:');
    expect(fixPrompt).toContain('Slide 2: título com 70 caracteres (máximo 60).');
    expect(fixPrompt).toContain('Deve conter no mínimo 2 fontes.');
    expect(fixPrompt).toContain('Corrija e responda somente com o objeto JSON completo');
  });

  it('buildSuggestionsPrompt inclui os tópicos e itens informados', () => {
    const prompt = buildSuggestionsPrompt({
      topics: 'inteligência artificial, compliance',
      items: sampleItems,
    });

    expect(prompt).toContain('inteligência artificial, compliance');
    expect(prompt).toContain('https://fonte.com/noticia-a');
    expect(prompt).toContain('3 sugestões de pauta');
  });
});
