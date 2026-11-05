import { describe, it, expect } from 'vitest';
import { knockoutBackground, alphaBounds } from './images.js';

// Imagem 3×3: fundo cinza-claro (#F0F0F0) com um pixel cinza-escuro no centro (o "logo").
function sample(bg = [240, 240, 240]) {
  const data = new Uint8ClampedArray(3 * 3 * 4);
  for (let i = 0; i < 9; i++) data.set([...bg, 255], i * 4);
  data.set([80, 80, 80, 255], 4 * 4);
  return { data, width: 3, height: 3 };
}

describe('knockoutBackground', () => {
  it('torna transparente o fundo claro liso e preserva o desenho', () => {
    const img = sample();
    expect(knockoutBackground(img)).toBe(true);
    expect(img.data[3]).toBe(0);
    expect(img.data[4 * 4 + 3]).toBe(255);
  });

  it('não mexe em fundo escuro', () => {
    const img = sample([30, 30, 30]);
    expect(knockoutBackground(img)).toBe(false);
    expect(img.data[3]).toBe(255);
  });

  it('não mexe quando os cantos são diferentes (foto)', () => {
    const img = sample();
    img.data.set([200, 40, 60, 255], 0);
    expect(knockoutBackground(img)).toBe(false);
  });
});

describe('alphaBounds', () => {
  it('acha a caixa do que é visível depois de remover o fundo', () => {
    const img = sample();
    knockoutBackground(img);
    expect(alphaBounds(img)).toEqual({ x: 1, y: 1, w: 1, h: 1 });
  });

  it('imagem toda transparente não tem caixa', () => {
    expect(alphaBounds({ data: new Uint8ClampedArray(16), width: 2, height: 2 })).toBeNull();
  });
});
