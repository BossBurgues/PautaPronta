// Preparo de imagens enviadas pelo usuário (fotos dos slides e logo).

const MAX_PHOTO_SIDE = 1600;
const MAX_LOGO_SIDE = 900;
const ACCEPTED = /^image\/(png|jpeg|webp|svg\+xml)$/;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function decode(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Formato de imagem inválido. Use PNG, JPG ou WebP.'));
    img.src = src;
  });
}

function drawScaled(img, maxSide) {
  const w = img.naturalWidth || img.width || maxSide;
  const h = img.naturalHeight || img.height || maxSide;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function checkType(file) {
  if (!file || !ACCEPTED.test(file.type)) throw new Error('Formato não aceito. Use PNG, JPG, WebP ou SVG.');
}

/** Foto para um slide: reduzida (lado maior ≤ 1600 px) e salva em JPEG para caber no rascunho. */
export async function fileToSlideImage(file) {
  checkType(file);
  const img = await decode(await readAsDataUrl(file));
  return drawScaled(img, MAX_PHOTO_SIDE).toDataURL('image/jpeg', 0.85);
}

/**
 * Se os quatro cantos têm a mesma cor clara (fundo liso, como um logo exportado sobre cinza),
 * torna essa cor transparente, com borda suave. Altera `imageData.data` e devolve true se mudou.
 */
export function knockoutBackground(imageData, tolerance = 28) {
  const { data, width, height } = imageData;
  const at = (x, y) => (y * width + x) * 4;
  const corners = [at(0, 0), at(width - 1, 0), at(0, height - 1), at(width - 1, height - 1)].map((i) => [data[i], data[i + 1], data[i + 2], data[i + 3]]);
  const [r, g, b, a] = corners[0];
  const sameAsFirst = corners.every((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) < 12 && c[3] > 250);
  const light = 0.299 * r + 0.587 * g + 0.114 * b > 200;
  if (!sameAsFirst || !light || a < 250) return false;
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.abs(data[i] - r) + Math.abs(data[i + 1] - g) + Math.abs(data[i + 2] - b);
    if (dist <= tolerance) data[i + 3] = 0;
    else if (dist <= tolerance * 2) data[i + 3] = Math.round((data[i + 3] * (dist - tolerance)) / tolerance);
  }
  return true;
}

/**
 * Caixa do que é visível (alfa > 8). Sem ela, margens transparentes do arquivo empurram o logo
 * para dentro do slide e ele não alinha com o texto. Retorna null se a imagem for toda transparente.
 */
export function alphaBounds(imageData) {
  const { data, width, height } = imageData;
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Logo: reduzido (lado maior ≤ 900 px), fundo claro liso removido, margens vazias cortadas, salvo em PNG. */
export async function fileToLogo(file) {
  checkType(file);
  const img = await decode(await readAsDataUrl(file));
  const canvas = drawScaled(img, MAX_LOGO_SIDE);
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (knockoutBackground(imageData)) ctx.putImageData(imageData, 0, 0);
  const box = alphaBounds(imageData);
  if (!box || (box.w === canvas.width && box.h === canvas.height)) return canvas.toDataURL('image/png');
  const cropped = document.createElement('canvas');
  cropped.width = box.w;
  cropped.height = box.h;
  cropped.getContext('2d').drawImage(canvas, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return cropped.toDataURL('image/png');
}
