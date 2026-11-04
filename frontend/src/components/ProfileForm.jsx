import { useEffect, useRef, useState } from 'react';
import { FONT_OPTIONS, DEFAULT_PROFILE } from '../state/defaults.js';
import { contrastRatio, parseHex } from '../state/color.js';
import { fileToLogo } from '../canvas/images.js';
import { getRenderSlides, loadSlideAssets } from '../canvas/renderSlide.js';
import sampleFixture from '../../../shared/fixtures/exemplo.json';
import SlidePreview from './SlidePreview.jsx';

const COLOR_FIELDS = [
  { key: 'bg', label: 'Fundo claro', hint: 'slides do meio' },
  { key: 'text', label: 'Grafite', hint: 'texto e fundo escuro' },
  { key: 'accent', label: 'Principal', hint: 'destaques' },
  { key: 'accent2', label: 'Secundária', hint: 'destaques alternativos' },
];

// Prévia: capa (escura), um slide de conteúdo (claro) e a conclusão.
const PREVIEW_INDEXES = [0, 2, sampleFixture.slides.length - 1];

export default function ProfileForm({ profile = DEFAULT_PROFILE, logoImg, onUpdateProfile, onResetProfile }) {
  const [logoError, setLogoError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const [assets, setAssets] = useState(null);

  const colors = { ...DEFAULT_PROFILE.colors, ...(profile?.colors || {}) };
  const ratio = contrastRatio(colors.text, colors.bg);
  const isLowContrast = ratio < 4.5;

  useEffect(() => {
    let cancelled = false;
    loadSlideAssets(sampleFixture, profile, logoImg).then((a) => !cancelled && setAssets(a));
    return () => {
      cancelled = true;
    };
  }, [profile, logoImg]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setLogoError('');
    setBusy(true);
    try {
      const dataUrl = await fileToLogo(file);
      if (onUpdateProfile({ logoDataUrl: dataUrl }) === false) {
        setLogoError('Imagem muito grande para guardar no navegador; use um arquivo menor.');
      }
    } catch (err) {
      setLogoError(err.message || 'Erro ao processar a imagem.');
    } finally {
      setBusy(false);
    }
  };

  const handleColorChange = (key, rawValue) => {
    let val = rawValue;
    if (val && !val.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(val)) val = `#${val}`;
    onUpdateProfile({ colors: { ...colors, [key]: val } });
  };

  const fontSelect = (id, label, key) => (
    <div className="form-group">
      <label htmlFor={id} className="form-label-row">
        <span>{label}</span>
      </label>
      <select id={id} value={profile[key]} onChange={(e) => onUpdateProfile({ [key]: e.target.value })} style={{ fontFamily: profile[key] }}>
        {FONT_OPTIONS.map((font) => (
          <option key={font} value={font} style={{ fontFamily: font }}>
            {font}
          </option>
        ))}
      </select>
    </div>
  );

  const renderList = getRenderSlides(sampleFixture);

  return (
    <div className="profile-form-card">
      <div className="profile-form-header">
        <div>
          <h3>Identidade visual</h3>
          <p className="profile-form-description">
            Logo, @, fontes e cores valem para todos os slides. A prévia ao lado muda na hora.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          title="Volta às cores e fontes HOTMILK; mantém logo e @"
          onClick={() => {
            setLogoError('');
            onResetProfile?.();
          }}
        >
          Restaurar padrão
        </button>
      </div>

      <div className="profile-workspace">
        <div className="profile-controls-col">
          {/* Logo */}
          <div className="form-group">
            <span className="form-label-row">
              <span>Logo</span>
              <span className="form-hint">Pequeno no rodapé, maior na capa e na conclusão</span>
            </span>
            <div className="logo-upload-row">
              <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
                {busy ? 'Processando…' : profile.logoDataUrl ? 'Trocar logo' : 'Escolher logo'}
              </button>
              {profile.logoDataUrl && (
                <button type="button" className="btn-danger-outline" onClick={() => onUpdateProfile({ logoDataUrl: '' })}>
                  Remover logo
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleFileChange} hidden />
            </div>
            <p className="field-hint">
              PNG com fundo transparente é o ideal. Se o arquivo tiver fundo claro liso, ele é removido
              automaticamente; nos slides escuros o logo aparece em branco.
            </p>
            {profile.logoDataUrl && (
              <div className="logo-thumbnail-box">
                <img src={profile.logoDataUrl} alt="Prévia do logo" className="logo-thumbnail-img" />
              </div>
            )}
            {logoError && (
              <p className="field-hint-error" role="alert">
                {logoError}
              </p>
            )}
          </div>

          <div className="generate-options-grid">
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="profile-handle">@ do rodapé</label>
                <span className="char-counter">{(profile.handle || '').length} / 40</span>
              </div>
              <input
                id="profile-handle"
                type="text"
                maxLength={40}
                value={profile.handle || ''}
                onChange={(e) => onUpdateProfile({ handle: e.target.value.slice(0, 40) })}
                placeholder="@perfil da conta onde vai publicar"
              />
            </div>
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="profile-kicker">Rótulo do topo (opcional)</label>
                <span className="char-counter">{(profile.kicker || '').length} / 32</span>
              </div>
              <input
                id="profile-kicker"
                type="text"
                maxLength={32}
                value={profile.kicker || ''}
                onChange={(e) => onUpdateProfile({ kicker: e.target.value.slice(0, 32) })}
                placeholder="Ex.: CIS.IA / INSIGHTS"
              />
            </div>
          </div>

          <div className="generate-options-grid">
            {fontSelect('profile-title-font', 'Fonte dos títulos', 'titleFont')}
            {fontSelect('profile-body-font', 'Fonte dos textos', 'bodyFont')}
          </div>

          <div className="generate-options-grid">
            <div className="form-group">
              <label htmlFor="profile-highlight" className="form-label-row">
                <span>Cor dos destaques</span>
              </label>
              <select id="profile-highlight" value={profile.highlight || 'accent'} onChange={(e) => onUpdateProfile({ highlight: e.target.value })}>
                <option value="accent">Principal</option>
                <option value="accent2">Secundária</option>
              </select>
            </div>
            <label className="checkbox-label profile-check">
              <input
                type="checkbox"
                checked={Boolean(profile.uppercaseTitles)}
                onChange={(e) => onUpdateProfile({ uppercaseTitles: e.target.checked })}
              />
              <span>Títulos em maiúsculas</span>
            </label>
          </div>

          <div className="form-group">
            <span className="form-label-row">
              <span>Cores</span>
              <span className="form-hint">Contraste texto × fundo: {ratio.toFixed(2)}:1</span>
            </span>
            <div className="color-pickers-grid">
              {COLOR_FIELDS.map(({ key, label, hint }) => {
                const rawVal = colors[key] || DEFAULT_PROFILE.colors[key];
                const pickerVal = parseHex(rawVal) && rawVal.startsWith('#') && rawVal.length === 7 ? rawVal : DEFAULT_PROFILE.colors[key];
                return (
                  <div key={key} className="color-field-item">
                    <span className="color-field-label">
                      {label} <small>{hint}</small>
                    </span>
                    <div className="color-inputs-row">
                      <input
                        type="color"
                        aria-label={`Cor ${label}`}
                        value={pickerVal}
                        onChange={(e) => handleColorChange(key, e.target.value.toUpperCase())}
                        className="color-swatch-input"
                      />
                      <input
                        type="text"
                        aria-label={`Código da cor ${label}`}
                        value={rawVal}
                        maxLength={7}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="color-hex-input"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {isLowContrast && (
            <div className="callout callout-warning contrast-warning-banner" role="alert">
              <strong>Contraste baixo: o texto pode ficar difícil de ler.</strong>
              <p>
                Entre o grafite ({colors.text}) e o fundo claro ({colors.bg}) a razão é de <strong>{ratio.toFixed(2)}:1</strong>; o
                recomendado é pelo menos 4,5:1.
              </p>
            </div>
          )}
        </div>

        <div className="profile-preview-col">
          <h4 className="profile-preview-title">Prévia ao vivo</h4>
          <div className="profile-previews-row">
            {assets &&
              PREVIEW_INDEXES.map((i) => (
                <SlidePreview
                  key={i}
                  item={renderList[i]}
                  position={i + 1}
                  total={renderList.length}
                  content={sampleFixture}
                  profile={profile}
                  assets={assets}
                  logoImg={logoImg}
                  downloadable={false}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
