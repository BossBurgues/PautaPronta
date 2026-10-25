import { describe, it, expect } from 'vitest';
import { contrastRatio, parseHex } from './color.js';

describe('color contrastRatio', () => {
  it('retorna 21 para preto × branco', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 2);
  });

  it('retorna 1 para a mesma cor', () => {
    expect(contrastRatio('#0B5FFF', '#0B5FFF')).toBe(1);
    expect(contrastRatio('#FFFFFF', '#ffffff')).toBe(1);
  });

  it('retorna aproximadamente 4.48 para #777777 × branco (#FFFFFF)', () => {
    const ratio = contrastRatio('#777777', '#FFFFFF');
    expect(ratio).toBeCloseTo(4.48, 2);
  });

  it('retorna < 4.5 para #BBBBBB sobre #FFFFFF (aviso de contraste baixo)', () => {
    expect(contrastRatio('#BBBBBB', '#FFFFFF')).toBeLessThan(4.5);
  });

  it('faz parse de formatos hex de 3 e 6 dígitos', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('1A1A1A')).toEqual([26, 26, 26]);
    expect(parseHex('invalido')).toBeNull();
  });
});
