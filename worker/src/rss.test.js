import { describe, it, expect } from 'vitest';
import { parseFeed } from './rss.js';

describe('worker/rss', () => {
  it('faz parse de RSS 2.0 com CDATA e entidades HTML (&amp;)', () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Notícias de Tecnologia &amp; Inovação</title>
    <link>https://portal.com</link>
    <item>
      <title><![CDATA[IA &amp; Automação no Setor Público]]></title>
      <description><![CDATA[Um resumo sobre <b>tecnologia</b> &amp; gestão moderna.]]></description>
      <link>https://portal.com/noticia-1</link>
      <pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>LGPD e Conformidade</title>
      <description>Diretrizes essenciais de proteção de dados.</description>
      <link>https://portal.com/noticia-2</link>
      <pubDate>Sun, 11 Oct 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(rssXml, 'https://www.portal.com/rss.xml');

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('IA & Automação no Setor Público');
    expect(items[0].summary).toBe('Um resumo sobre tecnologia & gestão moderna.');
    expect(items[0].link).toBe('https://portal.com/noticia-1');
    expect(items[0].source).toBe('portal.com');
    expect(items[0].date).toBeGreaterThan(0);

    expect(items[1].title).toBe('LGPD e Conformidade');
    expect(items[1].link).toBe('https://portal.com/noticia-2');
  });

  it('faz parse de feed Atom com link no atributo href', () => {
    const atomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Canal Inovação</title>
  <entry>
    <title>Cidades Inteligentes e Sustentabilidade</title>
    <summary>Estudo sobre eficiência energética urbana.</summary>
    <link rel="alternate" type="text/html" href="https://cidades.org/estudo-2026"/>
    <updated>2026-10-10T15:30:00Z</updated>
  </entry>
</feed>`;

    const items = parseFeed(atomXml, 'https://cidades.org/atom.xml');

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Cidades Inteligentes e Sustentabilidade');
    expect(items[0].summary).toBe('Estudo sobre eficiência energética urbana.');
    expect(items[0].link).toBe('https://cidades.org/estudo-2026');
    expect(items[0].source).toBe('cidades.org');
    expect(items[0].date).toBe(Date.parse('2026-10-10T15:30:00Z'));
  });
});
