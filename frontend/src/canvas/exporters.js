// jszip e jspdf são grandes (~600 KB): carregados só quando o usuário exporta (import dinâmico).
import { SLIDE_W, SLIDE_H, ensureFonts, renderSlide } from './renderSlide.js';

/**
 * Normaliza um texto para um slug seguro para nomes de arquivos (máx. 40 caracteres).
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') return 'carrossel';

  const cleaned = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const trimmed = cleaned.slice(0, 40).replace(/-+$/, '');
  return trimmed || 'carrossel';
}

/**
 * Renderiza um slide em um canvas fora da tela (offscreen) com dimensões 1080×1350.
 */
export async function renderToCanvas(content, index, profile, logoImg) {
  const canvas = document.createElement('canvas');
  canvas.width = SLIDE_W;
  canvas.height = SLIDE_H;
  const ctx = canvas.getContext('2d');

  await ensureFonts(profile?.fontFamily || 'Inter');

  const slide = content?.slides?.[index];
  const total = content?.slides?.length || 1;

  renderSlide(ctx, {
    slide,
    index,
    total,
    content,
    profile,
    logoImg,
  });

  return canvas;
}

/**
 * Converte um elemento canvas para um Blob assincronamente.
 */
export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Falha ao converter o canvas para Blob.'));
      },
      type,
      quality,
    );
  });
}

/**
 * Dispara o download de um Blob no navegador.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exporta todos os slides em um arquivo ZIP contendo PNGs individuais (1080×1350).
 */
export async function exportPngZip(content, profile, logoImg) {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const slug = slugify(content?.topic);
  const slides = content?.slides || [];

  for (let i = 0; i < slides.length; i++) {
    const canvas = await renderToCanvas(content, i, profile, logoImg);
    const blob = await canvasToBlob(canvas, 'image/png');
    const num = String(i + 1).padStart(2, '0');
    zip.file(`slide-${num}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const filename = `pauta-pronta-${slug}.zip`;
  downloadBlob(zipBlob, filename);
  return filename;
}

/**
 * Exporta o carrossel completo em um documento PDF (uma página por slide, 1080×1350).
 */
export async function exportPdf(content, profile, logoImg) {
  const slug = slugify(content?.topic);
  const filename = `pauta-pronta-${slug}.pdf`;

  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'px',
    format: [1080, 1350],
    hotfixes: ['px_scaling'],
    compress: true,
  });

  const slides = content?.slides || [];

  for (let i = 0; i < slides.length; i++) {
    const canvas = await renderToCanvas(content, i, profile, logoImg);
    if (i > 0) {
      pdf.addPage([1080, 1350], 'portrait');
    }
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    pdf.addImage(imgData, 'JPEG', 0, 0, 1080, 1350);
  }

  pdf.save(filename);
  return filename;
}

/**
 * Exporta uma imagem única em formato de mosaico para WhatsApp (2 colunas, 540×675 por slide).
 */
export async function exportWhatsappMosaic(content, profile, logoImg) {
  const slug = slugify(content?.topic);
  const filename = `pauta-pronta-${slug}-whatsapp.jpg`;
  const slides = content?.slides || [];
  const n = slides.length;
  const rows = Math.ceil(n / 2);
  const cellW = 540;
  const cellH = 675;

  const mosaicCanvas = document.createElement('canvas');
  mosaicCanvas.width = 1080;
  mosaicCanvas.height = cellH * rows;
  const mCtx = mosaicCanvas.getContext('2d');

  const colors = profile?.colors || { bg: '#F7F7F5' };
  mCtx.fillStyle = colors.bg;
  mCtx.fillRect(0, 0, mosaicCanvas.width, mosaicCanvas.height);

  for (let i = 0; i < n; i++) {
    const canvas = await renderToCanvas(content, i, profile, logoImg);
    const col = i % 2;
    const row = Math.floor(i / 2);
    const destX = col * cellW;
    const destY = row * cellH;
    mCtx.drawImage(canvas, 0, 0, SLIDE_W, SLIDE_H, destX, destY, cellW, cellH);
  }

  const blob = await canvasToBlob(mosaicCanvas, 'image/jpeg', 0.85);
  downloadBlob(blob, filename);
  return filename;
}

/**
 * Exporta um slide específico como imagem PNG individual (1080×1350).
 */
export async function exportSingleSlide(content, index, profile, logoImg) {
  const num = String(index + 1).padStart(2, '0');
  const filename = `slide-${num}.png`;
  const canvas = await renderToCanvas(content, index, profile, logoImg);
  const blob = await canvasToBlob(canvas, 'image/png');
  downloadBlob(blob, filename);
  return filename;
}

/**
 * Constrói o texto formatado da legenda para publicação nas redes.
 */
export function buildCaption(content, network = 'linkedin') {
  const captionText =
    network === 'instagram'
      ? content?.caption_instagram || ''
      : content?.caption_linkedin || '';

  const parts = [];
  if (captionText.trim()) parts.push(captionText.trim());
  if (content?.cta && content.cta.trim()) parts.push(content.cta.trim());

  const hashtags = Array.isArray(content?.hashtags) ? content.hashtags : [];
  if (hashtags.length > 0) {
    parts.push(hashtags.join(' '));
  }

  let result = parts.join('\n\n');

  if (network === 'linkedin') {
    const sources = Array.isArray(content?.sources) ? content.sources : [];
    if (sources.length > 0) {
      const sourcesText = sources
        .filter((s) => s && s.url)
        .map((s) => `- ${s.title ? s.title + ': ' : ''}${s.url}`)
        .join('\n');
      if (sourcesText) {
        result += `\n\nFontes:\n${sourcesText}`;
      }
    }
  }

  return result;
}

/**
 * Copia texto para a área de transferência com fallback seguro.
 */
export async function copyText(text) {
  if (
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback abaixo
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
