// Identidade padrão: HOTMILK (cores, fontes e logo oficial HOTMILK + PUCPR indicados pelo Lucivandro).
// O @ do rodapé depende da conta onde vai publicar: é preenchido na aba Configurações.
export const DEFAULT_LOGO = '/brand/logo-hotmilk-pucpr.png';

export const DEFAULT_PROFILE = {
  logoDataUrl: DEFAULT_LOGO,
  // @ do rodapé por rede: o PDF (LinkedIn) usa um, as imagens (Instagram) usam o outro.
  handleLinkedin: '',
  handleInstagram: '',
  kicker: '',
  titleFont: 'Saira',
  bodyFont: 'Open Sans',
  uppercaseTitles: true,
  titleWeight: 'bold',
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
  // Perfil com um @ só: vale para as duas redes até ser separado.
  if (p.handle && !p.handleLinkedin) p.handleLinkedin = p.handle;
  if (p.handle && !p.handleInstagram) p.handleInstagram = p.handle;
  delete p.handle;
  const colors = { ...(p.colors || {}) };
  delete colors.muted;
  return {
    ...DEFAULT_PROFILE,
    ...p,
    colors: { ...DEFAULT_PROFILE.colors, ...colors },
  };
}
