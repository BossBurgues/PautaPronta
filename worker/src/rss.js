/**
 * Utilitários para decodificar entidades HTML e limpar tags.
 */
function cleanText(str) {
  if (!str || typeof str !== 'string') return '';
  let s = str.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  return s.replace(/\s+/g, ' ').trim();
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function extractAtomLink(block) {
  const alternateMatch =
    block.match(
      /<link\s+[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    ) ||
    block.match(
      /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']alternate["'][^>]*>/i,
    );
  if (alternateMatch) return alternateMatch[1].trim();

  const hrefMatch = block.match(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch) return hrefMatch[1].trim();

  const textMatch = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  if (textMatch) return cleanText(textMatch[1]);
  return '';
}

/**
 * Faz o parse de XML de feed (RSS 2.0 ou Atom) exclusivamente por regex.
 */
export function parseFeed(xml, feedUrl = '') {
  if (!xml || typeof xml !== 'string') return [];

  const items = [];
  const source = getHostname(feedUrl);

  const rssMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  const isRss = rssMatches.length > 0;
  const blocks = isRss ? rssMatches : xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];

  for (const block of blocks) {
    // Título
    const titleMatch = block.match(/<title[\s>][\s\S]*?<\/title>/i);
    const title = titleMatch ? cleanText(titleMatch[0]) : '';
    if (!title) continue;

    // Resumo / Descrição
    let summary = '';
    const descMatch =
      block.match(/<content:encoded[\s>][\s\S]*?<\/content:encoded>/i) ||
      block.match(/<description[\s>][\s\S]*?<\/description>/i) ||
      block.match(/<summary[\s>][\s\S]*?<\/summary>/i);
    if (descMatch) {
      summary = cleanText(descMatch[0]).slice(0, 300);
    }

    // Link
    let link = '';
    if (isRss) {
      const linkMatch = block.match(/<link[\s>][\s\S]*?<\/link>/i);
      if (linkMatch) {
        link = cleanText(linkMatch[0]);
      }
      if (!link) {
        const guidMatch = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
        if (guidMatch && /^https?:\/\//i.test(guidMatch[1].trim())) {
          link = guidMatch[1].trim();
        }
      }
    } else {
      link = extractAtomLink(block);
    }

    // Data
    const dateMatch =
      block.match(/<pubDate[\s>][\s\S]*?<\/pubDate>/i) ||
      block.match(/<published[\s>][\s\S]*?<\/published>/i) ||
      block.match(/<updated[\s>][\s\S]*?<\/updated>/i) ||
      block.match(/<dc:date[\s>][\s\S]*?<\/dc:date>/i);

    let date = 0;
    if (dateMatch) {
      const rawDate = cleanText(dateMatch[0]);
      const parsed = Date.parse(rawDate);
      date = isNaN(parsed) ? 0 : parsed;
    }

    items.push({
      title,
      summary,
      link,
      date,
      source,
    });
  }

  return items;
}

/**
 * Busca múltiplos feeds RSS em paralelo com limite de CPU e payload.
 */
export async function fetchFeeds(
  urls,
  { timeoutMs = 5000, maxBytes = 200_000, maxItems = 6, maxFeeds = 8 } = {},
) {
  const validUrls = (Array.isArray(urls) ? urls : [])
    .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
    .slice(0, maxFeeds);

  const errors = [];
  const allItems = [];

  const promises = validUrls.map(async (url) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'PautaPronta/1.0' },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        errors.push({ url, message: `Status HTTP ${res.status}` });
        return;
      }

      const text = await res.text();
      const truncatedXml = text.slice(0, maxBytes);
      const parsed = parseFeed(truncatedXml, url);
      allItems.push(...parsed);
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err.name === 'AbortError' ? 'Tempo limite esgotado' : err.message;
      errors.push({ url, message: msg });
    }
  });

  await Promise.allSettled(promises);

  // Deduplicação por link ou título em minúsculas
  const seenLinks = new Set();
  const seenTitles = new Set();
  const uniqueItems = [];

  for (const item of allItems) {
    const linkKey = item.link ? item.link.toLowerCase().trim() : '';
    const titleKey = item.title.toLowerCase().trim();

    if (linkKey && seenLinks.has(linkKey)) continue;
    if (seenTitles.has(titleKey)) continue;

    if (linkKey) seenLinks.add(linkKey);
    seenTitles.add(titleKey);
    uniqueItems.push(item);
  }

  // Ordena por data decrescente e corta no máximo configurado
  uniqueItems.sort((a, b) => b.date - a.date);
  const items = uniqueItems.slice(0, maxItems);

  return { items, errors };
}
