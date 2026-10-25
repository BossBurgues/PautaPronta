/**
 * Extrai o hostname em minúsculas e sem prefixo www.
 */
export function hostOf(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url.trim());
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Verifica as fontes citadas comparando-as com os feeds consultados e o grounding da busca web.
 */
export function verifySources(sources, { items = [], grounding = [] } = {}) {
  if (!Array.isArray(sources)) return [];

  const itemHosts = new Set(
    (items || []).map((it) => hostOf(it?.link)).filter(Boolean),
  );

  // O Gemini põe o domínio no título ("mit.edu" ou "mit.edu: Título"); pega só esse começo.
  const groundingTitles = (grounding || [])
    .map((g) => (g?.title || '').toLowerCase().trim().split(/[\s:|]/)[0].replace(/^www\./, ''))
    .filter((title) => title.includes('.'));

  const groundingHosts = new Set(
    (grounding || [])
      .filter((g) => {
        const uri = g?.uri || '';
        return !uri.includes('vertexaisearch.cloud.google.com');
      })
      .map((g) => hostOf(g?.uri))
      .filter(Boolean),
  );

  return sources.map((src) => {
    const sHost = hostOf(src?.url);
    if (!sHost) return { ...src, verified: false };

    // 1. Igual ao host de algum item do RSS
    if (itemHosts.has(sHost)) {
      return { ...src, verified: true };
    }

    // 2. Igual ou termina com algum grounding.title (Gemini costuma colocar domínio no title)
    const matchesTitle = groundingTitles.some(
      (title) => title === sHost || sHost.endsWith(`.${title}`),
    );
    if (matchesTitle) {
      return { ...src, verified: true };
    }

    // 3. Igual ao host de algum grounding.uri (exceto redirecionamentos internos da Vertex AI)
    if (groundingHosts.has(sHost)) {
      return { ...src, verified: true };
    }

    return { ...src, verified: false };
  });
}

/**
 * Constrói a lista combinada de fontes usadas a partir dos itens de RSS e grounding.
 */
export function buildUsedSources(items = [], grounding = []) {
  const seen = new Set();
  const result = [];

  for (const it of items || []) {
    const url = it?.link ? it.link.trim() : '';
    if (url && !seen.has(url)) {
      seen.add(url);
      result.push({ title: it.title || '', url });
    }
  }

  for (const g of grounding || []) {
    const url = g?.uri ? g.uri.trim() : '';
    if (
      url &&
      !url.includes('vertexaisearch.cloud.google.com') &&
      !seen.has(url)
    ) {
      seen.add(url);
      result.push({ title: g.title || '', url });
    }
  }

  return result;
}
