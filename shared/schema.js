export const LIMITS = {
  slidesMin: 4,
  slidesMax: 7,
  titleMax: 60,
  bodyMax: 220,
  hashtagsMin: 3,
  hashtagsMax: 5,
  sourcesMin: 2,
  captionLinkedinMax: 3000,
  captionInstagramMax: 2200,
  ctaMax: 150,
  statMax: 12,
  stepsMin: 2,
  stepsMax: 4,
  stepLabelMax: 32,
  stepTextMax: 90,
  sourceLineMax: 120,
};

export const ROLES = ['capa', 'contexto', 'ponto', 'conclusao'];

// Composições do slide. As três primeiras a IA pode escolher; as de imagem só o usuário,
// porque a ferramenta não gera imagens (ele insere a imagem na Revisão).
export const AI_LAYOUTS = ['texto', 'destaque', 'passos'];
export const LAYOUTS = [...AI_LAYOUTS, 'imagem-topo', 'imagem-lado', 'imagem-fundo'];
export const THEMES = ['auto', 'claro', 'escuro'];

// Negrito no texto do slide: **palavra**. Os marcadores não contam no limite de caracteres.
export function stripMarks(text) {
  return String(text || '').replace(/\*\*/g, '');
}

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function normalizeImage(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.src !== 'string') return undefined;
  if (!/^data:image\/(png|jpeg|webp);base64,/i.test(raw.src)) return undefined;
  return {
    src: raw.src,
    focusX: clamp(raw.focusX, 0, 100, 50),
    focusY: clamp(raw.focusY, 0, 100, 50),
    zoom: clamp(raw.zoom, 1, 3, 1),
  };
}

function normalizeSteps(raw) {
  if (!Array.isArray(raw)) return undefined;
  const steps = raw
    .filter((s) => s && typeof s === 'object')
    .map((s) => ({
      label: typeof s.label === 'string' ? s.label.trim() : '',
      text: typeof s.text === 'string' ? s.text.trim() : '',
    }))
    .filter((s) => s.label || s.text)
    .slice(0, LIMITS.stepsMax);
  return steps.length ? steps : undefined;
}

// Formato aceito pelo campo generationConfig.responseSchema do Gemini (subconjunto de OpenAPI).
export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    topic: { type: 'STRING' },
    slides: {
      type: 'ARRAY',
      minItems: 4,
      maxItems: 7,
      items: {
        type: 'OBJECT',
        properties: {
          n: { type: 'INTEGER' },
          role: { type: 'STRING', enum: ['capa', 'contexto', 'ponto', 'conclusao'] },
          title: { type: 'STRING' },
          body: { type: 'STRING' },
          layout: { type: 'STRING', enum: ['texto', 'destaque', 'passos'] },
          stat: { type: 'STRING' },
          steps: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { label: { type: 'STRING' }, text: { type: 'STRING' } },
              required: ['label', 'text'],
            },
          },
          source: { type: 'STRING' },
        },
        required: ['n', 'role', 'title', 'body'],
      },
    },
    caption_linkedin: { type: 'STRING' },
    caption_instagram: { type: 'STRING' },
    hashtags: { type: 'ARRAY', items: { type: 'STRING' } },
    cta: { type: 'STRING' },
    sources: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { title: { type: 'STRING' }, url: { type: 'STRING' } },
        required: ['title', 'url'],
      },
    },
  },
  required: ['topic', 'slides', 'caption_linkedin', 'caption_instagram', 'hashtags', 'cta', 'sources'],
};

/**
 * Normaliza o conteúdo bruto retornado pela IA ou inserido pelo usuário.
 * Nunca lança erro e tolera campos ausentes ou incompletos.
 *
 * @param {any} raw
 * @returns {object}
 */
export function normalizeContent(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};

  const topic = typeof data.topic === 'string' ? data.topic.trim() : '';
  const caption_linkedin =
    typeof data.caption_linkedin === 'string' ? data.caption_linkedin.trim() : '';
  const caption_instagram =
    typeof data.caption_instagram === 'string' ? data.caption_instagram.trim() : '';
  const cta = typeof data.cta === 'string' ? data.cta.trim() : '';

  // Normalização de slides
  const rawSlides = Array.isArray(data.slides) ? data.slides : [];
  const slideCount = rawSlides.length;

  const slides = rawSlides.map((slide, index) => {
    const s = slide && typeof slide === 'object' ? slide : {};
    const title = typeof s.title === 'string' ? s.title.trim() : '';
    const body = typeof s.body === 'string' ? s.body.trim() : '';

    let role = typeof s.role === 'string' ? s.role.trim().toLowerCase() : '';
    if (!ROLES.includes(role)) {
      if (index === 0) {
        role = 'capa';
      } else if (index === slideCount - 1) {
        role = 'conclusao';
      } else if (index === 1) {
        role = 'contexto';
      } else {
        role = 'ponto';
      }
    }

    const normalized = { n: index + 1, role, title, body };
    // Campos opcionais: só entram quando válidos, para o JSON continuar enxuto.
    if (LAYOUTS.includes(s.layout)) normalized.layout = s.layout;
    if (THEMES.includes(s.theme) && s.theme !== 'auto') normalized.theme = s.theme;
    if (typeof s.stat === 'string' && s.stat.trim()) normalized.stat = s.stat.trim();
    if (typeof s.source === 'string' && s.source.trim()) normalized.source = s.source.trim();
    const steps = normalizeSteps(s.steps);
    if (steps) normalized.steps = steps;
    const image = normalizeImage(s.image);
    if (image) normalized.image = image;
    return normalized;
  });

  // Normalização de hashtags
  let rawHashtags = [];
  if (Array.isArray(data.hashtags)) {
    rawHashtags = data.hashtags;
  } else if (typeof data.hashtags === 'string') {
    rawHashtags = data.hashtags.split(/[, \n\t]+/);
  }

  const seenHashtags = new Set();
  const hashtags = [];

  for (const item of rawHashtags) {
    if (typeof item !== 'string') continue;
    let clean = item.replace(/\s+/g, '').trim();
    if (!clean) continue;
    if (!clean.startsWith('#')) {
      clean = `#${clean}`;
    }
    const lower = clean.toLowerCase();
    if (!seenHashtags.has(lower)) {
      seenHashtags.add(lower);
      hashtags.push(clean);
      if (hashtags.length >= LIMITS.hashtagsMax) break;
    }
  }

  // Normalização de fontes
  const rawSources = Array.isArray(data.sources) ? data.sources : [];
  const seenUrls = new Set();
  const sources = [];

  for (const src of rawSources) {
    if (!src || typeof src !== 'object') continue;
    const url = typeof src.url === 'string' ? src.url.trim() : '';
    if (!url) continue;

    if (!seenUrls.has(url)) {
      seenUrls.add(url);
      const title = typeof src.title === 'string' ? src.title.trim() : '';
      const normalizedSource = { title, url };
      if (typeof src.verified === 'boolean') {
        normalizedSource.verified = src.verified;
      }
      sources.push(normalizedSource);
    }
  }

  return {
    topic,
    slides,
    caption_linkedin,
    caption_instagram,
    hashtags,
    cta,
    sources,
  };
}

/**
 * Valida o conteúdo normalizado e aponta erros bloqueantes e avisos.
 *
 * @param {object} content
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateContent(content) {
  const errors = [];
  const warnings = [];

  if (!content || typeof content !== 'object') {
    return {
      valid: false,
      errors: ['Conteúdo inválido ou ausente.'],
      warnings: [],
    };
  }

  // Erros estruturais
  if (!content.topic || !content.topic.trim()) {
    errors.push('O tema (topic) não pode ser vazio.');
  }

  const slides = Array.isArray(content.slides) ? content.slides : [];
  if (slides.length < LIMITS.slidesMin || slides.length > LIMITS.slidesMax) {
    errors.push(
      `A quantidade de slides deve estar entre ${LIMITS.slidesMin} e ${LIMITS.slidesMax} (atual: ${slides.length}).`,
    );
  }

  slides.forEach((slide, idx) => {
    const num = slide.n || idx + 1;
    if (!slide.title || !slide.title.trim()) {
      errors.push(`Slide ${num}: título não pode ser vazio.`);
    }
    if (!slide.body || !slide.body.trim()) {
      errors.push(`Slide ${num}: corpo não pode ser vazio.`);
    }

    // Avisos de tamanho do slide (sem contar os marcadores ** de negrito)
    const titleLen = stripMarks(slide.title).length;
    const bodyLen = stripMarks(slide.body).length;
    if (titleLen > LIMITS.titleMax) {
      warnings.push(
        `Slide ${num}: título com ${titleLen} caracteres (máximo ${LIMITS.titleMax}). Resuma para caber bem no slide.`,
      );
    }
    if (bodyLen > LIMITS.bodyMax) {
      warnings.push(
        `Slide ${num}: texto com ${bodyLen} caracteres (máximo ${LIMITS.bodyMax}). Resuma para caber bem no slide.`,
      );
    }
    if (slide.layout === 'destaque') {
      if (!slide.stat) warnings.push(`Slide ${num}: informe o número em destaque (ex.: 40%).`);
      else if (slide.stat.length > LIMITS.statMax) {
        warnings.push(`Slide ${num}: número em destaque com mais de ${LIMITS.statMax} caracteres.`);
      }
    }
    if (slide.layout === 'passos') {
      const steps = Array.isArray(slide.steps) ? slide.steps : [];
      if (steps.length < LIMITS.stepsMin) {
        warnings.push(`Slide ${num}: inclua de ${LIMITS.stepsMin} a ${LIMITS.stepsMax} passos.`);
      }
      steps.forEach((step, i) => {
        if (stripMarks(step.text).length > LIMITS.stepTextMax) {
          warnings.push(`Slide ${num}, passo ${i + 1}: texto com mais de ${LIMITS.stepTextMax} caracteres.`);
        }
        if ((step.label || '').length > LIMITS.stepLabelMax) {
          warnings.push(`Slide ${num}, passo ${i + 1}: rótulo com mais de ${LIMITS.stepLabelMax} caracteres.`);
        }
      });
    }
    if (slide.source && slide.source.length > LIMITS.sourceLineMax) {
      warnings.push(`Slide ${num}: linha de fonte com mais de ${LIMITS.sourceLineMax} caracteres.`);
    }
  });

  if (!content.caption_linkedin || !content.caption_linkedin.trim()) {
    errors.push('A legenda do LinkedIn não pode ser vazia.');
  } else if (content.caption_linkedin.length > LIMITS.captionLinkedinMax) {
    warnings.push(
      `Legenda do LinkedIn com ${content.caption_linkedin.length} caracteres (máximo ${LIMITS.captionLinkedinMax}).`,
    );
  }

  if (!content.caption_instagram || !content.caption_instagram.trim()) {
    errors.push('A legenda do Instagram não pode ser vazia.');
  } else if (content.caption_instagram.length > LIMITS.captionInstagramMax) {
    warnings.push(
      `Legenda do Instagram com ${content.caption_instagram.length} caracteres (máximo ${LIMITS.captionInstagramMax}).`,
    );
  }

  if (!content.cta || !content.cta.trim()) {
    errors.push('A chamada para ação (CTA) não pode ser vazia.');
  } else {
    if (content.cta.length > LIMITS.ctaMax) {
      warnings.push(
        `CTA com ${content.cta.length} caracteres (máximo ${LIMITS.ctaMax}).`,
      );
    }
    if (!content.cta.trim().endsWith('?')) {
      warnings.push("CTA: deve terminar com '?' (pergunta natural).");
    }
  }

  const hashtags = Array.isArray(content.hashtags) ? content.hashtags : [];
  if (hashtags.length < LIMITS.hashtagsMin) {
    errors.push(
      `Deve conter no mínimo ${LIMITS.hashtagsMin} hashtags (atual: ${hashtags.length}).`,
    );
  }

  const sources = Array.isArray(content.sources) ? content.sources : [];
  if (sources.length < LIMITS.sourcesMin) {
    errors.push(
      `Deve conter no mínimo ${LIMITS.sourcesMin} fontes (atual: ${sources.length}).`,
    );
  }

  sources.forEach((source, idx) => {
    const label = source.title ? `"${source.title}"` : `Fonte ${idx + 1}`;
    const rawUrl = typeof source.url === 'string' ? source.url.trim() : '';

    let isValid = false;
    if (/^https?:\/\//i.test(rawUrl)) {
      try {
        new URL(rawUrl);
        isValid = true;
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      errors.push(
        `Fonte ${label}: URL inválida ("${source.url}"). Deve começar com http:// ou https://.`,
      );
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
