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

// Move um slide para cima (delta -1) ou para baixo (+1). O papel (capa, conclusão…) vai junto.
export function moveSlide(content, index, delta) {
  if (!content || !Array.isArray(content.slides)) return content;
  const to = index + delta;
  if (index < 0 || index >= content.slides.length || to < 0 || to >= content.slides.length) return content;
  const slides = [...content.slides];
  [slides[index], slides[to]] = [slides[to], slides[index]];
  return { ...content, slides: renumber(slides) };
}

// Formato "Texto + imagem" escolhido na tela Gerar: prepara as composições com espaço para imagem
// (o autor insere as imagens na Revisão). Infográficos que a IA já escolheu ficam como estão.
export function applyVisualFormat(content, visualFormat) {
  if (!content || visualFormat !== 'texto-imagem' || !Array.isArray(content.slides)) return content;
  let middle = 0;
  const slides = content.slides.map((slide) => {
    if (slide.role === 'capa') return { ...slide, layout: 'imagem-fundo' };
    if (slide.role === 'conclusao') return slide;
    if (slide.layout === 'destaque' || slide.layout === 'passos') return slide;
    middle += 1;
    return { ...slide, layout: middle % 2 ? 'imagem-topo' : 'imagem-lado' };
  });
  return { ...content, slides };
}
