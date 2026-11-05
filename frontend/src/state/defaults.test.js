import { describe, it, expect } from 'vitest';
import { migrateProfile, DEFAULT_PROFILE } from './defaults.js';

describe('migrateProfile', () => {
  it('perfil vazio recebe a identidade HOTMILK', () => {
    expect(migrateProfile(undefined)).toEqual(DEFAULT_PROFILE);
    expect(DEFAULT_PROFILE.colors).toEqual({ bg: '#F0F0F0', text: '#1E1E1E', accent: '#FF024B', accent2: '#A20136' });
  });

  it('perfil antigo com fontFamily e muted vira titleFont/bodyFont, sem muted', () => {
    const p = migrateProfile({ fontFamily: 'Lora', handle: '@x', colors: { bg: '#FFFFFF', muted: '#777777' } });
    expect(p.titleFont).toBe('Lora');
    expect(p.bodyFont).toBe('Lora');
    expect(p.fontFamily).toBeUndefined();
    expect(p.colors.muted).toBeUndefined();
    expect(p.colors.bg).toBe('#FFFFFF');
    expect(p.colors.accent).toBe('#FF024B');
    expect(p.handleLinkedin).toBe('@x');
    expect(p.handleInstagram).toBe('@x');
    expect(p.handle).toBeUndefined();
  });
});
