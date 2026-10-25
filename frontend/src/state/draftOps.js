import { LIMITS, normalizeContent } from '../../../shared/schema.js';

// Operações puras sobre o rascunho em edição.
// Não usam normalizeContent nas edições: ele apara espaços e descarta fontes sem URL,
// o que impede digitar normalmente. A normalização completa fica para o conteúdo que chega
// de fora (API, modo assistido, histórico) — ver useDraft.setContent.

function renumber(slides) {
  return slides.map((slide, i) => ({ ...slide, n: i + 1 }));
}

export function patchSlide(content, index, patch) {
  if (!content || !Array.isArray(content.slides)) return content;
  const slides = content.slides.map((slide, i) => (i === index ? { ...slide, ...patch } : slide));
  return { ...content, slides };
}

export function setField(content, name, value) {
  if (!content) return content;
  // Hashtags chegam como texto livre (ao sair do campo); essas sim são normalizadas.
  if (name === 'hashtags') {
    return { ...content, hashtags: normalizeContent({ hashtags: value }).hashtags };
  }
  return { ...content, [name]: value };
}

export function insertSlide(content) {
  if (!content || !Array.isArray(content.slides)) return content;
  if (content.slides.length >= LIMITS.slidesMax) return content;
  const slides = [...content.slides];
  slides.splice(Math.max(0, slides.length - 1), 0, { role: 'ponto', title: '', body: '' });
  return { ...content, slides: renumber(slides) };
}

export function deleteSlide(content, index) {
  if (!content || !Array.isArray(content.slides)) return content;
  if (content.slides.length <= LIMITS.slidesMin) return content;
  return { ...content, slides: renumber(content.slides.filter((_, i) => i !== index)) };
}
