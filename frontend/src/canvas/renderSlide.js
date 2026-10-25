export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

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
export function fitText({
  text,
  maxWidth,
  maxHeight,
  maxSize,
  minSize,
  lineHeight,
  measureAt,
}) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    const lines = wrapText(text, maxWidth, measureAt(size));
    if (lines.length * size * lineHeight <= maxHeight) {
      return { size, lines, overflow: false };
    }
  }
  const lines = wrapText(text, maxWidth, measureAt(minSize));
  return { size: minSize, lines, overflow: true };
}

/**
 * Garante que as fontes do Google Fonts estejam carregadas no navegador antes do render.
 */
export async function ensureFonts(fontFamily) {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`700 64px "${fontFamily}"`),
      document.fonts.load(`400 40px "${fontFamily}"`),
    ]);
  } catch (error) {
    // Segue com fontes do sistema em caso de falha de rede
  }
}

/**
 * Carrega uma imagem a partir de uma dataURL ou URL.
 * Retorna null se vazio ou falhar.
 */
export function loadImage(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }
}

/**
 * Renderiza um slide individual no contexto 2D do Canvas.
 */
export function renderSlide(
  ctx,
  { slide, index, total, content, profile, logoImg },
) {
  const colors = profile?.colors || {
    bg: '#F7F7F5',
    text: '#1A1A1A',
    accent: '#0B5FFF',
    muted: '#6B7280',
  };
  const fontFamily = profile?.fontFamily || 'Inter';

  // 1. Fundo
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, SLIDE_W, SLIDE_H);

  // 2. Faixa superior de destaque (accent)
  ctx.fillStyle = colors.accent;
  ctx.fillRect(0, 0, SLIDE_W, 16);

  // Margens
  const marginX = 96;
  const contentWidth = SLIDE_W - marginX * 2; // 888 px
  const footerY = SLIDE_H - 64;

  const measureBold = (size) => (str) => {
    ctx.font = `700 ${size}px "${fontFamily}", sans-serif`;
    return ctx.measureText(str).width;
  };

  const measureRegular = (size) => (str) => {
    ctx.font = `400 ${size}px "${fontFamily}", sans-serif`;
    return ctx.measureText(str).width;
  };

  const role = slide?.role || 'ponto';

  if (role === 'capa') {
    // Layout da Capa: título 84→56 px centralizado na vertical, corpo 40→30 px logo abaixo
    const maxTitleHeight = 500;
    const maxBodyHeight = 300;

    const titleFit = fitText({
      text: slide.title || '',
      maxWidth: contentWidth,
      maxHeight: maxTitleHeight,
      maxSize: 84,
      minSize: 56,
      lineHeight: 1.2,
      measureAt: (size) => measureBold(size),
    });

    const bodyFit = fitText({
      text: slide.body || '',
      maxWidth: contentWidth,
      maxHeight: maxBodyHeight,
      maxSize: 40,
      minSize: 30,
      lineHeight: 1.4,
      measureAt: (size) => measureRegular(size),
    });

    const titleH = titleFit.lines.length * titleFit.size * 1.2;
    const gap = slide.body ? 40 : 0;
    const bodyH = slide.body ? bodyFit.lines.length * bodyFit.size * 1.4 : 0;
    const totalBlockH = titleH + gap + bodyH;

    let startY = Math.max(200, (SLIDE_H - 100 - totalBlockH) / 2);

    // Desenha título
    ctx.fillStyle = colors.text;
    ctx.font = `700 ${titleFit.size}px "${fontFamily}", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    let currentY = startY;
    for (const line of titleFit.lines) {
      ctx.fillText(line, marginX, currentY);
      currentY += titleFit.size * 1.2;
    }

    // Desenha corpo
    if (slide.body) {
      currentY += gap;
      ctx.fillStyle = colors.muted;
      ctx.font = `400 ${bodyFit.size}px "${fontFamily}", sans-serif`;
      for (const line of bodyFit.lines) {
        ctx.fillText(line, marginX, currentY);
        currentY += bodyFit.size * 1.4;
      }
    }
  } else if (role === 'conclusao') {
    // Layout da Conclusão: título + corpo + caixa arredondada de CTA + fontes
    let currentY = 180;

    const titleFit = fitText({
      text: slide.title || '',
      maxWidth: contentWidth,
      maxHeight: 220,
      maxSize: 64,
      minSize: 44,
      lineHeight: 1.2,
      measureAt: (size) => measureBold(size),
    });

    ctx.fillStyle = colors.text;
    ctx.font = `700 ${titleFit.size}px "${fontFamily}", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (const line of titleFit.lines) {
      ctx.fillText(line, marginX, currentY);
      currentY += titleFit.size * 1.2;
    }

    currentY += 36;

    if (slide.body) {
      const bodyFit = fitText({
        text: slide.body,
        maxWidth: contentWidth,
        maxHeight: 200,
        maxSize: 38,
        minSize: 28,
        lineHeight: 1.4,
        measureAt: (size) => measureRegular(size),
      });

      ctx.fillStyle = colors.text;
      ctx.font = `400 ${bodyFit.size}px "${fontFamily}", sans-serif`;
      for (const line of bodyFit.lines) {
        ctx.fillText(line, marginX, currentY);
        currentY += bodyFit.size * 1.4;
      }
      currentY += 40;
    }

    // Caixa arredondada com CTA
    const ctaText = content?.cta || '';
    if (ctaText) {
      const ctaFit = fitText({
        text: ctaText,
        maxWidth: contentWidth - 48,
        maxHeight: 160,
        maxSize: 36,
        minSize: 26,
        lineHeight: 1.3,
        measureAt: (size) => measureBold(size),
      });

      const boxPadding = 24;
      const boxH = ctaFit.lines.length * ctaFit.size * 1.3 + boxPadding * 2;

      // Fundo CTA (accent com 10% opacidade)
      ctx.save();
      ctx.fillStyle = colors.accent;
      ctx.globalAlpha = 0.1;
      drawRoundedRect(ctx, marginX, currentY, contentWidth, boxH, 16);
      ctx.fill();
      ctx.restore();

      // Borda CTA
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2.5;
      drawRoundedRect(ctx, marginX, currentY, contentWidth, boxH, 16);
      ctx.stroke();

      // Texto CTA
      ctx.fillStyle = colors.accent;
      ctx.font = `700 ${ctaFit.size}px "${fontFamily}", sans-serif`;
      let ctaY = currentY + boxPadding;
      for (const line of ctaFit.lines) {
        ctx.fillText(line, marginX + boxPadding, ctaY);
        ctaY += ctaFit.size * 1.3;
      }

      currentY += boxH + 40;
    }

    // Seção de Fontes
    const sources = Array.isArray(content?.sources) ? content.sources : [];
    if (sources.length > 0) {
      ctx.fillStyle = colors.muted;
      ctx.font = `700 28px "${fontFamily}", sans-serif`;
      ctx.fillText('Fontes:', marginX, currentY);
      currentY += 36;

      ctx.font = `400 26px "${fontFamily}", sans-serif`;
      const maxSourceLines = 4;
      let linesCount = 0;

      for (const src of sources) {
        if (linesCount >= maxSourceLines) break;
        let domain = '';
        try {
          domain = new URL(src.url).hostname.replace(/^www\./, '');
        } catch {
          domain = '';
        }
        const sourceLabel = domain
          ? `${src.title || 'Fonte'} — ${domain}`
          : src.title || src.url || 'Fonte';

        const lines = wrapText(sourceLabel, contentWidth, (s) => ctx.measureText(s).width);
        for (const line of lines) {
          if (linesCount >= maxSourceLines) break;
          ctx.fillText(`• ${line}`, marginX, currentY);
          currentY += 34;
          linesCount++;
        }
      }
    }
  } else {
    // Layout padrão: contexto ou ponto
    let currentY = 180;

    const titleFit = fitText({
      text: slide.title || '',
      maxWidth: contentWidth,
      maxHeight: 250,
      maxSize: 64,
      minSize: 44,
      lineHeight: 1.2,
      measureAt: (size) => measureBold(size),
    });

    ctx.fillStyle = colors.text;
    ctx.font = `700 ${titleFit.size}px "${fontFamily}", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (const line of titleFit.lines) {
      ctx.fillText(line, marginX, currentY);
      currentY += titleFit.size * 1.2;
    }

    currentY += 48; // Gap de 48px

    if (slide.body) {
      const maxBodyHeight = footerY - currentY - 60;
      const bodyFit = fitText({
        text: slide.body,
        maxWidth: contentWidth,
        maxHeight: Math.max(300, maxBodyHeight),
        maxSize: 40,
        minSize: 30,
        lineHeight: 1.4,
        measureAt: (size) => measureRegular(size),
      });

      ctx.fillStyle = colors.text;
      ctx.font = `400 ${bodyFit.size}px "${fontFamily}", sans-serif`;
      for (const line of bodyFit.lines) {
        ctx.fillText(line, marginX, currentY);
        currentY += bodyFit.size * 1.4;
      }
    }
  }

  // 4. Rodapé a 64 px da borda inferior
  let handleX = marginX;

  // Logo à esquerda
  if (logoImg && logoImg.width > 0 && logoImg.height > 0) {
    const maxLogoH = 72;
    const aspect = logoImg.width / logoImg.height;
    const logoW = maxLogoH * aspect;
    ctx.drawImage(logoImg, marginX, footerY - maxLogoH, logoW, maxLogoH);
    handleX += logoW + 20;
  }

  // @handle ao lado do logo
  if (profile?.handle) {
    ctx.fillStyle = colors.muted;
    ctx.font = `500 30px "${fontFamily}", sans-serif`;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(profile.handle, handleX, footerY);
  }

  // Numeração "index + 1 / total" à direita
  ctx.fillStyle = colors.muted;
  ctx.font = `700 30px "${fontFamily}", sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';
  ctx.fillText(`${index + 1}/${total}`, SLIDE_W - marginX, footerY);
}
