// Desenho dos slides no Canvas (1080 × 1350).
// Identidade padrão: HOTMILK — capa e conclusão escuras, slides do meio claros, Saira nos títulos,
// Open Sans nos textos. Tudo vem do perfil (aba Config); nada de marca fica fixo aqui.
import { stripMarks } from '../../../shared/schema.js';

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

const M = 96; // margem lateral
const CONTENT_TOP = 168;
const IMAGE_LAYOUTS = ['imagem-topo', 'imagem-lado', 'imagem-fundo'];

// ---------------------------------------------------------------------------
// Texto simples (mantidos para compatibilidade e testes)
// ---------------------------------------------------------------------------

/**
 * Quebra texto em linhas que cabem em maxWidth.
 * measure(str) => largura em px. Respeita \n e quebra palavras gigantes.
 */
export function wrapText(text, maxWidth, measure) {
  const lines = [];
  for (const paragraph of String(text || '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const tentative = line ? line + ' ' + word : word;
      if (measure(tentative) <= maxWidth) {
        line = tentative;
        continue;
      }
      if (line) lines.push(line);
      if (measure(word) <= maxWidth) {
        line = word;
        continue;
      }
      let chunk = '';
      for (const ch of word) {
        if (measure(chunk + ch) > maxWidth) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      line = chunk;
    }
    lines.push(line);
  }
  return lines;
}

/**
 * Reduz a fonte de maxSize até minSize (passo 2) até o texto caber em maxHeight.
 * measureAt(size) => (str) => largura. Retorna { size, lines, overflow }.
 */
export function fitText({ text, maxWidth, maxHeight, maxSize, minSize, lineHeight, measureAt }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = wrapText(text, maxWidth, measureAt(size));
    if (lines.length * size * lineHeight <= maxHeight) {
      return { size, lines, overflow: false };
    }
  }
  const lines = wrapText(text, maxWidth, measureAt(minSize));
  return { size: minSize, lines, overflow: true };
}

// ---------------------------------------------------------------------------
// Texto com negrito (**palavra**)
// ---------------------------------------------------------------------------

/** Separa o texto em palavras, espaços e quebras, marcando o que está entre ** como negrito. */
export function tokenizeRich(text) {
  const tokens = [];
  for (const part of String(text || '').split(/(\*\*[^*]+?\*\*)/g)) {
    if (!part) continue;
    const bold = /^\*\*[^*]+\*\*$/.test(part);
    const raw = bold ? part.slice(2, -2) : part.replace(/\*\*/g, '');
    for (const chunk of raw.split(/(\n)/)) {
      if (chunk === '\n') {
        tokens.push({ br: true });
        continue;
      }
      for (const piece of chunk.split(/(\s+)/)) {
        if (!piece) continue;
        tokens.push(/^\s+$/.test(piece) ? { space: true } : { text: piece, bold });
      }
    }
  }
  return tokens;
}

/**
 * Quebra texto rico em linhas. measure(texto, negrito) => largura.
 * Cada linha é uma lista de trechos { text, bold } (espaços já incluídos).
 */
export function wrapRich(text, maxWidth, measure) {
  const lines = [];
  let line = [];
  let width = 0;
  let pendingSpace = false;
  const push = (text, bold) => {
    const last = line.at(-1);
    if (last && last.bold === bold) last.text += text;
    else line.push({ text, bold });
  };
  const newLine = () => {
    lines.push(line);
    line = [];
    width = 0;
    pendingSpace = false;
  };
  for (const token of tokenizeRich(text)) {
    if (token.br) {
      newLine();
      continue;
    }
    if (token.space) {
      pendingSpace = line.length > 0;
      continue;
    }
    const w = measure(token.text, token.bold);
    const spaceW = pendingSpace ? measure(' ', false) : 0;
    if (line.length && width + spaceW + w <= maxWidth) {
      if (pendingSpace) push(' ', false);
      push(token.text, token.bold);
      width += spaceW + w;
      pendingSpace = false;
      continue;
    }
    if (line.length) newLine();
    if (w <= maxWidth) {
      push(token.text, token.bold);
      width = w;
      continue;
    }
    // Palavra maior que a linha: quebra por caractere.
    let chunk = '';
    for (const ch of token.text) {
      if (chunk && measure(chunk + ch, token.bold) > maxWidth) {
        push(chunk, token.bold);
        newLine();
        chunk = ch;
      } else chunk += ch;
    }
    push(chunk, token.bold);
    width = measure(chunk, token.bold);
  }
  if (line.length || !lines.length) lines.push(line);
  return lines;
}

/**
 * Como fitText, para texto rico. Se nem no tamanho mínimo couber, corta as linhas que sobram
 * e termina com "…" (overflow: true → o app avisa para resumir; a letra não encolhe além do mínimo).
 */
export function fitRich({ text, maxWidth, maxHeight, maxSize, minSize, lineHeight, measureAt }) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = wrapRich(text, maxWidth, measureAt(size));
    if (lines.length * size * lineHeight <= maxHeight) return { size, lines, overflow: false };
  }
  const measure = measureAt(minSize);
  const lines = wrapRich(text, maxWidth, measure);
  const maxLines = Math.max(1, Math.floor(maxHeight / (minSize * lineHeight)));
  if (lines.length <= maxLines) return { size: minSize, lines, overflow: false };
  const kept = lines.slice(0, maxLines);
  const last = kept.at(-1);
  const tail = last.at(-1) || { text: '', bold: false };
  while (tail.text && measure(last.map((r) => r.text).join('') + '…', false) > maxWidth) {
    tail.text = tail.text.slice(0, -1);
  }
  tail.text = tail.text.replace(/\s+$/, '') + '…';
  return { size: minSize, lines: kept, overflow: true };
}

// ---------------------------------------------------------------------------
// Fontes, imagens e cores
// ---------------------------------------------------------------------------

export function resolveFonts(profile) {
  return {
    title: profile?.titleFont || profile?.fontFamily || 'Saira',
    body: profile?.bodyFont || profile?.fontFamily || 'Open Sans',
  };
}

/** Garante que as fontes do perfil estejam carregadas antes do desenho (senão sai com a fonte errada). */
export async function ensureFonts(profileOrFamily) {
  if (typeof document === 'undefined' || !document.fonts) return;
  const fonts =
    typeof profileOrFamily === 'string'
      ? { title: profileOrFamily, body: profileOrFamily }
      : resolveFonts(profileOrFamily);
  try {
    await Promise.all([
      document.fonts.load(`700 64px "${fonts.title}"`),
      document.fonts.load(`600 64px "${fonts.title}"`),
      document.fonts.load(`400 40px "${fonts.body}"`),
      document.fonts.load(`700 40px "${fonts.body}"`),
    ]);
  } catch {
    // Segue com a fonte de reserva.
  }
}

/** Carrega uma imagem a partir de um dataURL. Retorna null se vazio ou com erro. */
export function loadImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Versão clara do logo, para slides escuros: mesma forma, pintada de branco. */
export function makeLightLogo(img) {
  if (!img || typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#F5F5F5';
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

const imageCache = new Map();

/** Carrega logo (normal e claro) e as imagens dos slides. Cacheado por src. */
export async function loadSlideAssets(content, profile, logoImg = null) {
  const images = new Map();
  const srcs = (content?.slides || []).map((s) => s?.image?.src).filter(Boolean);
  await Promise.all(
    [...new Set(srcs)].map(async (src) => {
      if (!imageCache.has(src)) imageCache.set(src, await loadImage(src));
      images.set(src, imageCache.get(src));
    }),
  );
  const logo = logoImg || (profile?.logoDataUrl ? await loadImage(profile.logoDataUrl) : null);
  return { images, logo, logoLight: makeLightLogo(logo) };
}

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return [128, 128, 128];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mistura duas cores: t = 0 → a, t = 1 → b. */
export function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** Tema do slide: escolhido no slide, ou automático (capa e conclusão escuras). */
export function slideTheme(slide, kind = 'slide') {
  if (kind === 'fontes') return 'claro';
  if (slide?.layout === 'imagem-fundo') return 'escuro';
  if (slide?.theme === 'claro' || slide?.theme === 'escuro') return slide.theme;
  return slide?.role === 'capa' || slide?.role === 'conclusao' ? 'escuro' : 'claro';
}

export function paletteFor(profile, theme) {
  const c = profile?.colors || {};
  const light = c.bg || '#F0F0F0';
  const ink = c.text || '#1E1E1E';
  const accent = c.accent || '#FF024B';
  const accent2 = c.accent2 || c.muted || '#A20136';
  if (theme === 'escuro') {
    return { bg: ink, fg: light, muted: mix(light, ink, 0.38), hl: accent, soft: mix(ink, accent, 0.18), line: mix(ink, light, 0.18) };
  }
  const hl = profile?.highlight === 'accent2' ? accent2 : accent;
  return { bg: light, fg: ink, muted: mix(ink, light, 0.42), hl, soft: mix(light, hl, 0.1), line: mix(light, ink, 0.14) };
}

// ---------------------------------------------------------------------------
// Lista de slides para desenhar (inclui o slide extra de fontes)
// ---------------------------------------------------------------------------

export const MAX_SOURCES_ON_CONCLUSION = 3;

export function getRenderSlides(content) {
  const slides = Array.isArray(content?.slides) ? content.slides : [];
  const sources = (Array.isArray(content?.sources) ? content.sources : []).filter((s) => s?.url?.trim() || s?.title?.trim());
  const list = slides.map((slide, index) => ({ kind: 'slide', slide, index }));
  if (sources.length > MAX_SOURCES_ON_CONCLUSION) list.push({ kind: 'fontes', slide: null, index: slides.length });
  return list;
}

// ---------------------------------------------------------------------------
// Desenho
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

function drawRichLines(ctx, lines, x, y, { size, lineHeight, font, color, boldColor, boldWeight = 700, weight = 400 }) {
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  let cy = y;
  for (const line of lines) {
    let cx = x;
    for (const run of line) {
      ctx.font = `${run.bold ? boldWeight : weight} ${size}px "${font}", sans-serif`;
      ctx.fillStyle = run.bold ? boldColor : color;
      ctx.fillText(run.text, cx, cy);
      cx += ctx.measureText(run.text).width;
    }
    cy += size * lineHeight;
  }
  return cy;
}

function measurer(ctx, font, weight, boldWeight = 700) {
  return (size) => (text, bold) => {
    ctx.font = `${bold ? boldWeight : weight} ${size}px "${font}", sans-serif`;
    return ctx.measureText(text).width;
  };
}

/** Bloco de texto rico: mede, ajusta e desenha. Retorna { bottom, overflow, height }. */
function textBlock(ctx, text, { x, y, width, maxHeight, maxSize, minSize, lineHeight, font, weight, boldWeight, color, boldColor, measureOnly = false }) {
  const fit = fitRich({ text, maxWidth: width, maxHeight, maxSize, minSize, lineHeight, measureAt: measurer(ctx, font, weight, boldWeight) });
  const height = fit.lines.length * fit.size * lineHeight;
  if (!measureOnly) {
    drawRichLines(ctx, fit.lines, x, y, { size: fit.size, lineHeight, font, color, boldColor, weight, boldWeight });
  }
  return { bottom: y + height, height, overflow: fit.overflow, size: fit.size };
}

function titleText(slide, profile) {
  const t = slide?.title || '';
  return profile?.uppercaseTitles ? t.toUpperCase() : t;
}

/** Imagem em "cover" com ponto focal e zoom (o recorte feito na Revisão). */
function drawCover(ctx, img, box, image, radius = 24) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const zoom = image?.zoom || 1;
  const scale = Math.max(box.w / iw, box.h / ih) * zoom;
  const sw = box.w / scale;
  const sh = box.h / scale;
  const sx = (iw - sw) * ((image?.focusX ?? 50) / 100);
  const sy = (ih - sh) * ((image?.focusY ?? 50) / 100);
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, box.x, box.y, box.w, box.h);
  ctx.restore();
}

function drawImagePlaceholder(ctx, box, pal, fonts) {
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, 24);
  ctx.fillStyle = pal.soft;
  ctx.fill();
  ctx.setLineDash([14, 10]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = pal.muted;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = pal.muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 34px "${fonts.body}", sans-serif`;
  ctx.fillText('Insira uma imagem', box.x + box.w / 2, box.y + box.h / 2 - 22);
  ctx.font = `400 26px "${fonts.body}", sans-serif`;
  ctx.fillText('no editor deste slide', box.x + box.w / 2, box.y + box.h / 2 + 24);
  ctx.restore();
}

/** Arcos decorativos no canto (inspirados nas linhas do site HOTMILK). */
function drawArcs(ctx, pal) {
  ctx.save();
  ctx.strokeStyle = pal.hl;
  for (let i = 0; i < 4; i++) {
    ctx.globalAlpha = 0.28 - i * 0.05;
    ctx.lineWidth = 3 - i * 0.5;
    ctx.beginPath();
    ctx.arc(SLIDE_W + 40, SLIDE_H - 60, 360 + i * 70, Math.PI, Math.PI * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawHeader(ctx, { profile, pal, fonts, position, total }) {
  ctx.textBaseline = 'alphabetic';
  if (profile?.kicker) {
    ctx.fillStyle = pal.hl;
    ctx.textAlign = 'left';
    ctx.font = `700 28px "${fonts.body}", sans-serif`;
    ctx.fillText(profile.kicker.toUpperCase(), M, 100);
  }
  ctx.fillStyle = pal.muted;
  ctx.textAlign = 'right';
  ctx.font = `700 28px "${fonts.body}", sans-serif`;
  ctx.fillText(`${String(position).padStart(2, '0')} / ${String(total).padStart(2, '0')}`, SLIDE_W - M, 100);
}

function drawFooter(ctx, { profile, pal, fonts, theme, assets, big }) {
  const logo = theme === 'escuro' ? assets?.logoLight || assets?.logo : assets?.logo;
  const maxH = big ? 104 : 60;
  const maxW = big ? 520 : 340;
  const centerY = SLIDE_H - (big ? 112 : 92);
  if (logo) {
    const lw = logo.naturalWidth || logo.width;
    const lh = logo.naturalHeight || logo.height;
    const scale = Math.min(maxH / lh, maxW / lw);
    ctx.drawImage(logo, M, centerY - (lh * scale) / 2, lw * scale, lh * scale);
  }
  if (profile?.handle) {
    ctx.fillStyle = pal.muted;
    ctx.font = `600 30px "${fonts.body}", sans-serif`;
    ctx.textBaseline = 'middle';
    // Com logo, o @ vai para a direita, alinhado ao centro do logo; sem logo, fica à esquerda.
    ctx.textAlign = logo ? 'right' : 'left';
    ctx.fillText(profile.handle, logo ? SLIDE_W - M : M, centerY);
    ctx.textBaseline = 'alphabetic';
  }
}

function drawSourceLine(ctx, text, { pal, fonts, bottom }) {
  if (!text) return bottom;
  const lines = wrapText(stripMarks(text), SLIDE_W - M * 2, (s) => {
    ctx.font = `400 24px "${fonts.body}", sans-serif`;
    return ctx.measureText(s).width;
  }).slice(0, 2);
  ctx.fillStyle = pal.muted;
  ctx.font = `400 24px "${fonts.body}", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const y = bottom - lines.length * 32;
  lines.forEach((l, i) => ctx.fillText(l, M, y + i * 32));
  return y - 24;
}

function accentBar(ctx, x, y, pal) {
  ctx.fillStyle = pal.hl;
  roundRect(ctx, x, y, 96, 10, 5);
  ctx.fill();
}

// Layout "texto" (capa, contexto, ponto). Bloco centralizado na altura disponível: sem o vão vazio embaixo.
function layoutTexto(ctx, { slide, profile, pal, fonts, area, isCapa }) {
  const width = area.w;
  const title = { text: titleText(slide, profile), x: area.x, width, maxSize: isCapa ? 104 : 80, minSize: isCapa ? 64 : 54, lineHeight: 1.1, font: fonts.title, weight: 700, boldWeight: 700, color: pal.fg, boldColor: pal.hl };
  const body = { text: slide?.body || '', x: area.x, width, maxSize: isCapa ? 44 : 48, minSize: 32, lineHeight: 1.42, font: fonts.body, weight: 400, boldWeight: 700, color: isCapa ? pal.muted : pal.fg, boldColor: isCapa ? pal.fg : pal.hl };
  const titleMax = area.h * (isCapa ? 0.5 : 0.42);
  const t = textBlock(ctx, title.text, { ...title, y: 0, maxHeight: titleMax, measureOnly: true });
  const gap = 56;
  const bodyMax = area.h - t.height - gap - 34;
  const b = textBlock(ctx, body.text, { ...body, y: 0, maxHeight: bodyMax, measureOnly: true });
  const total = 34 + t.height + (body.text ? gap + b.height : 0);
  const y0 = isCapa ? area.y + Math.max(0, (area.h - total) * 0.62) : area.y + Math.max(0, (area.h - total) * 0.42);
  accentBar(ctx, area.x, y0, pal);
  const tr = textBlock(ctx, title.text, { ...title, y: y0 + 34, maxHeight: titleMax });
  let overflow = tr.overflow;
  if (body.text) overflow = textBlock(ctx, body.text, { ...body, y: tr.bottom + gap, maxHeight: bodyMax }).overflow || overflow;
  return overflow;
}

// Layout "destaque": número grande + explicação.
function layoutDestaque(ctx, { slide, profile, pal, fonts, area }) {
  const tr = textBlock(ctx, titleText(slide, profile), { x: area.x, y: area.y, width: area.w, maxHeight: 200, maxSize: 72, minSize: 52, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
  const statText = slide?.stat || '—';
  let size = 300;
  ctx.font = `700 ${size}px "${fonts.title}", sans-serif`;
  while (size > 140 && ctx.measureText(statText).width > area.w) {
    size -= 10;
    ctx.font = `700 ${size}px "${fonts.title}", sans-serif`;
  }
  const statY = tr.bottom + 60;
  ctx.fillStyle = pal.hl;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(statText, area.x - 6, statY);
  const bodyY = statY + size * 0.95 + 36;
  const br = textBlock(ctx, slide?.body || '', { x: area.x, y: bodyY, width: area.w * 0.92, maxHeight: area.y + area.h - bodyY, maxSize: 44, minSize: 32, lineHeight: 1.42, font: fonts.body, weight: 400, color: pal.fg, boldColor: pal.hl });
  return tr.overflow || br.overflow;
}

// Layout "passos": 01, 02, 03… com rótulo e texto.
function layoutPassos(ctx, { slide, profile, pal, fonts, area }) {
  const tr = textBlock(ctx, titleText(slide, profile), { x: area.x, y: area.y, width: area.w, maxHeight: 180, maxSize: 72, minSize: 52, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
  const sub = textBlock(ctx, slide?.body || '', { x: area.x, y: tr.bottom + 28, width: area.w, maxHeight: 140, maxSize: 36, minSize: 30, lineHeight: 1.4, font: fonts.body, weight: 400, color: pal.muted, boldColor: pal.fg });
  const steps = (slide?.steps || []).slice(0, 4);
  if (!steps.length) return tr.overflow || sub.overflow;
  const top = sub.bottom + 56;
  const rowH = (area.y + area.h - top) / steps.length;
  let overflow = tr.overflow || sub.overflow;
  steps.forEach((step, i) => {
    const y = top + i * rowH;
    ctx.fillStyle = pal.hl;
    ctx.font = `700 76px "${fonts.title}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(String(i + 1).padStart(2, '0'), area.x, y - 6);
    const tx = area.x + 150;
    const tw = area.w - 150;
    ctx.fillStyle = pal.muted;
    ctx.font = `700 26px "${fonts.body}", sans-serif`;
    ctx.fillText((step.label || '').toUpperCase(), tx, y + 4);
    const r = textBlock(ctx, step.text || '', { x: tx, y: y + 46, width: tw, maxHeight: rowH - 70, maxSize: 38, minSize: 30, lineHeight: 1.3, font: fonts.body, weight: 600, boldWeight: 700, color: pal.fg, boldColor: pal.hl });
    overflow = overflow || r.overflow;
    if (i < steps.length - 1) {
      ctx.fillStyle = pal.line;
      ctx.fillRect(tx, y + rowH - 24, tw, 2);
    }
  });
  return overflow;
}

// Layouts com imagem.
function layoutImagem(ctx, { slide, profile, pal, fonts, area, assets, preview }) {
  const img = slide?.image?.src ? assets?.images?.get(slide.image.src) : null;
  const layout = slide.layout;
  if (layout === 'imagem-topo') {
    const box = { x: area.x, y: area.y, w: area.w, h: Math.round(area.h * 0.5) };
    if (img) drawCover(ctx, img, box, slide.image);
    else if (preview) drawImagePlaceholder(ctx, box, pal, fonts);
    const textArea = { x: area.x, y: box.y + box.h + 48, w: area.w, h: area.h - box.h - 48 };
    const tr = textBlock(ctx, titleText(slide, profile), { x: textArea.x, y: textArea.y, width: textArea.w, maxHeight: textArea.h * 0.45, maxSize: 64, minSize: 48, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
    const br = textBlock(ctx, slide?.body || '', { x: textArea.x, y: tr.bottom + 28, width: textArea.w, maxHeight: textArea.y + textArea.h - tr.bottom - 28, maxSize: 38, minSize: 30, lineHeight: 1.4, font: fonts.body, weight: 400, color: pal.fg, boldColor: pal.hl });
    return tr.overflow || br.overflow;
  }
  if (layout === 'imagem-lado') {
    const colW = Math.round(area.w * 0.48);
    const box = { x: area.x + colW + 40, y: area.y, w: area.w - colW - 40, h: area.h };
    if (img) drawCover(ctx, img, box, slide.image);
    else if (preview) drawImagePlaceholder(ctx, box, pal, fonts);
    const textArea = { x: area.x, y: area.y, w: colW, h: area.h };
    const t = textBlock(ctx, titleText(slide, profile), { x: 0, y: 0, width: colW, maxHeight: area.h * 0.45, maxSize: 60, minSize: 44, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl, measureOnly: true });
    const b = textBlock(ctx, slide?.body || '', { x: 0, y: 0, width: colW, maxHeight: area.h - t.height - 120, maxSize: 36, minSize: 30, lineHeight: 1.4, font: fonts.body, weight: 400, color: pal.fg, boldColor: pal.hl, measureOnly: true });
    const y0 = textArea.y + Math.max(0, (area.h - (34 + t.height + 40 + b.height)) / 2);
    accentBar(ctx, textArea.x, y0, pal);
    const tr = textBlock(ctx, titleText(slide, profile), { x: textArea.x, y: y0 + 34, width: colW, maxHeight: area.h * 0.45, maxSize: 60, minSize: 44, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
    const br = textBlock(ctx, slide?.body || '', { x: textArea.x, y: tr.bottom + 40, width: colW, maxHeight: area.h - t.height - 120, maxSize: 36, minSize: 30, lineHeight: 1.4, font: fonts.body, weight: 400, color: pal.fg, boldColor: pal.hl });
    return tr.overflow || br.overflow;
  }
  // imagem-fundo: imagem ocupa o slide, véu escuro embaixo, texto claro.
  if (img) {
    drawCover(ctx, img, { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H }, slide.image, 0);
    const grad = ctx.createLinearGradient(0, SLIDE_H * 0.2, 0, SLIDE_H);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.55, `${pal.bg}cc`);
    grad.addColorStop(1, pal.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);
    const top = ctx.createLinearGradient(0, 0, 0, 260);
    top.addColorStop(0, `${pal.bg}b3`);
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, SLIDE_W, 260);
  } else if (preview) {
    drawImagePlaceholder(ctx, { x: area.x, y: area.y, w: area.w, h: area.h * 0.45 }, pal, fonts);
  }
  const isCapa = slide.role === 'capa';
  const t = textBlock(ctx, titleText(slide, profile), { x: 0, y: 0, width: area.w, maxHeight: area.h * 0.38, maxSize: isCapa ? 96 : 76, minSize: 54, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl, measureOnly: true });
  const b = textBlock(ctx, slide?.body || '', { x: 0, y: 0, width: area.w, maxHeight: area.h * 0.3, maxSize: 40, minSize: 32, lineHeight: 1.42, font: fonts.body, weight: 400, color: pal.fg, boldColor: pal.hl, measureOnly: true });
  const y0 = area.y + area.h - (34 + t.height + 40 + b.height);
  accentBar(ctx, area.x, y0, pal);
  const tr = textBlock(ctx, titleText(slide, profile), { x: area.x, y: y0 + 34, width: area.w, maxHeight: area.h * 0.38, maxSize: isCapa ? 96 : 76, minSize: 54, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
  const br = textBlock(ctx, slide?.body || '', { x: area.x, y: tr.bottom + 40, width: area.w, maxHeight: area.h * 0.3, maxSize: 40, minSize: 32, lineHeight: 1.42, font: fonts.body, weight: 400, color: pal.fg, boldColor: pal.hl });
  return tr.overflow || br.overflow;
}

function shortSource(src, n) {
  let domain = '';
  try {
    domain = new URL(src.url).hostname.replace(/^www\./, '');
  } catch {
    domain = '';
  }
  const title = (src.title || domain || 'Fonte').trim();
  return `[${n}] ${title}${domain && !title.includes(domain) ? ` — ${domain}` : ''}`;
}

// Conclusão: pergunta em destaque e fontes resumidas (ou aviso do slide de fontes).
function layoutConclusao(ctx, { slide, content, profile, pal, fonts, area }) {
  const sources = (content?.sources || []).filter((s) => s?.url?.trim() || s?.title?.trim());
  const tr = textBlock(ctx, titleText(slide, profile), { x: area.x, y: area.y, width: area.w, maxHeight: 240, maxSize: 76, minSize: 52, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
  const br = textBlock(ctx, slide?.body || '', { x: area.x, y: tr.bottom + 32, width: area.w, maxHeight: 230, maxSize: 40, minSize: 32, lineHeight: 1.42, font: fonts.body, weight: 400, color: pal.muted, boldColor: pal.fg });
  let y = br.bottom + 48;
  let overflow = tr.overflow || br.overflow;
  const cta = content?.cta || '';
  if (cta) {
    const pad = 36;
    const m = textBlock(ctx, cta, { x: 0, y: 0, width: area.w - pad * 2, maxHeight: 220, maxSize: 44, minSize: 34, lineHeight: 1.25, font: fonts.title, weight: 700, color: '#FFFFFF', boldColor: '#FFFFFF', measureOnly: true });
    const boxH = m.height + pad * 2;
    ctx.fillStyle = pal.hl;
    roundRect(ctx, area.x, y, area.w, boxH, 24);
    ctx.fill();
    const r = textBlock(ctx, cta, { x: area.x + pad, y: y + pad, width: area.w - pad * 2, maxHeight: 220, maxSize: 44, minSize: 34, lineHeight: 1.25, font: fonts.title, weight: 700, color: '#FFFFFF', boldColor: '#FFFFFF' });
    overflow = overflow || r.overflow;
    y += boxH + 48;
  }
  if (sources.length) {
    ctx.fillStyle = pal.muted;
    ctx.font = `700 26px "${fonts.body}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('FONTES', area.x, y);
    y += 42;
    ctx.font = `400 28px "${fonts.body}", sans-serif`;
    const shown = sources.length > MAX_SOURCES_ON_CONCLUSION ? [] : sources;
    shown.forEach((src, i) => {
      const line = wrapText(shortSource(src, i + 1), area.w, (s) => ctx.measureText(s).width)[0];
      ctx.fillText(line, area.x, y);
      y += 40;
    });
    if (!shown.length) ctx.fillText(`${sources.length} referências numeradas no próximo slide.`, area.x, y);
  }
  return overflow;
}

// Slide extra só com as referências, quando são muitas para a conclusão.
function layoutFontes(ctx, { content, profile, pal, fonts, area }) {
  const sources = (content?.sources || []).filter((s) => s?.url?.trim() || s?.title?.trim());
  textBlock(ctx, profile?.uppercaseTitles ? 'FONTES CONSULTADAS' : 'Fontes consultadas', { x: area.x, y: area.y, width: area.w, maxHeight: 120, maxSize: 64, minSize: 52, lineHeight: 1.1, font: fonts.title, weight: 700, color: pal.fg, boldColor: pal.hl });
  let y = area.y + 130;
  const measure = (s) => {
    ctx.font = `400 30px "${fonts.body}", sans-serif`;
    return ctx.measureText(s).width;
  };
  let overflow = false;
  for (let i = 0; i < sources.length; i++) {
    const lines = wrapText(shortSource(sources[i], i + 1), area.w, measure).slice(0, 2);
    if (y + lines.length * 40 > area.y + area.h) {
      overflow = true;
      break;
    }
    ctx.fillStyle = pal.fg;
    ctx.font = `400 30px "${fonts.body}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, j) => ctx.fillText(l, area.x, y + j * 40));
    y += lines.length * 40 + 22;
  }
  ctx.fillStyle = pal.muted;
  ctx.font = `400 24px "${fonts.body}", sans-serif`;
  ctx.fillText('Links completos na legenda do post.', area.x, Math.min(y + 10, area.y + area.h - 24));
  return overflow;
}

/**
 * Desenha um item de getRenderSlides. Retorna { overflow } — true quando algum texto não coube
 * nem no tamanho mínimo (o app avisa para resumir).
 * options: { item, position (1..total), total, content, profile, assets, preview }
 */
export function renderSlide(ctx, options) {
  // Compatibilidade com a assinatura antiga: { slide, index, total, content, profile, logoImg }.
  const item = options.item || { kind: 'slide', slide: options.slide, index: options.index };
  const position = options.position ?? item.index + 1;
  const total = options.total ?? (options.content?.slides?.length || 1);
  const { content, profile, preview = false } = options;
  const assets = options.assets || { images: new Map(), logo: options.logoImg || null, logoLight: null };
  const slide = item.slide || {};
  const fonts = resolveFonts(profile);
  const theme = slideTheme(slide, item.kind);
  const pal = paletteFor(profile, theme);

  // Sem imagem no export, as composições com imagem viram texto.
  let layout = slide.layout || 'texto';
  if (IMAGE_LAYOUTS.includes(layout) && !slide.image?.src && !preview) layout = 'texto';
  const drawn = { ...slide, layout };

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  const isCapa = item.kind === 'slide' && slide.role === 'capa';
  const isConclusao = item.kind === 'slide' && slide.role === 'conclusao';
  // Arcos só na capa: na conclusão passariam por trás das fontes.
  if (isCapa && layout !== 'imagem-fundo') drawArcs(ctx, pal);

  const big = isCapa || isConclusao;
  const footerTop = SLIDE_H - (big ? 190 : 150);
  const sourceTop = drawSourceLine(ctx, item.kind === 'slide' ? slide.source : '', { pal, fonts, bottom: footerTop });
  const area = { x: M, y: CONTENT_TOP, w: SLIDE_W - M * 2, h: Math.min(footerTop, sourceTop) - 40 - CONTENT_TOP };
  const args = { slide: drawn, content, profile, pal, fonts, area, assets, preview, isCapa };

  let overflow;
  if (item.kind === 'fontes') overflow = layoutFontes(ctx, args);
  else if (IMAGE_LAYOUTS.includes(layout)) overflow = layoutImagem(ctx, args);
  else if (isConclusao) overflow = layoutConclusao(ctx, args);
  else if (layout === 'destaque') overflow = layoutDestaque(ctx, args);
  else if (layout === 'passos') overflow = layoutPassos(ctx, args);
  else overflow = layoutTexto(ctx, args);

  drawHeader(ctx, { profile, pal, fonts, position, total });
  drawFooter(ctx, { profile, pal, fonts, theme, assets, big });
  return { overflow: Boolean(overflow) };
}
