// Identidade padrão: HOTMILK (cores, fontes e logo oficial HOTMILK + PUCPR indicados pelo Lucivandro).
// O @ do rodapé depende da conta onde vai publicar: é preenchido na aba Configurações.
export const DEFAULT_LOGO = '/brand/logo-hotmilk-pucpr.png';

export const DEFAULT_PROFILE = {
  logoDataUrl: DEFAULT_LOGO,
  handle: '',
  kicker: '',
  titleFont: 'Saira',
  bodyFont: 'Open Sans',
  uppercaseTitles: true,
  highlight: 'accent',
  colors: {
    bg: '#F0F0F0',
    text: '#1E1E1E',
    accent: '#FF024B',
    accent2: '#A20136',
  },
};

export const FONT_OPTIONS = ['Saira', 'Open Sans', 'Montserrat', 'Inter', 'Poppins', 'Lora', 'Merriweather'];

// Perfil salvo antes desta versão tinha uma fonte só (fontFamily) e a cor "muted".
export function migrateProfile(saved) {
  const p = saved && typeof saved === 'object' ? { ...saved } : {};
  if (p.fontFamily && !p.titleFont) p.titleFont = p.fontFamily;
  if (p.fontFamily && !p.bodyFont) p.bodyFont = p.fontFamily;
  delete p.fontFamily;
  const colors = { ...(p.colors || {}) };
  delete colors.muted;
  return {
    ...DEFAULT_PROFILE,
    ...p,
    colors: { ...DEFAULT_PROFILE.colors, ...colors },
  };
}
