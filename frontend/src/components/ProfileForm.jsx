import { useState, useRef } from 'react';
import { FONT_OPTIONS, DEFAULT_PROFILE } from '../state/defaults.js';
import { contrastRatio, parseHex } from '../state/color.js';
import sampleFixture from '../../../shared/fixtures/exemplo.json';
import SlidePreview from './SlidePreview.jsx';

const COLOR_FIELDS = [
  { key: 'bg', label: 'Fundo' },
  { key: 'text', label: 'Texto' },
  { key: 'accent', label: 'Destaque' },
  { key: 'muted', label: 'Secundária' },
];

const MAX_LOGO_SIDE = 400;

/**
 * Redimensiona um arquivo de imagem mantendo proporção com lado maior <= 400 px
 * e fundo transparente, retornando um dataURL PNG.
 */
function resizeLogoFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        const srcW = img.naturalWidth || img.width || MAX_LOGO_SIDE;
        const srcH = img.naturalHeight || img.height || MAX_LOGO_SIDE;
        const scale = Math.min(1, MAX_LOGO_SIDE / Math.max(srcW, srcH));
        const targetW = Math.max(1, Math.round(srcW * scale));
        const targetH = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfileForm({
  profile = DEFAULT_PROFILE,
  logoImg,
  onUpdateProfile,
  onResetProfile,
}) {
  const [logoError, setLogoError] = useState('');
  const fileInputRef = useRef(null);

  const colors = {
    ...DEFAULT_PROFILE.colors,
    ...(profile?.colors || {}),
  };

  const ratio = contrastRatio(colors.text, colors.bg);
  const isLowContrast = ratio < 4.5;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');

    try {
      const dataUrl = await resizeLogoFile(file);
      const savedOk = onUpdateProfile({ logoDataUrl: dataUrl });
      if (savedOk === false) {
        setLogoError('Imagem muito grande; use um PNG menor.');
      }
    } catch (err) {
      setLogoError(err.message || 'Erro ao processar a imagem.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setLogoError('');
    onUpdateProfile({ logoDataUrl: '' });
  };

  const handleColorChange = (key, rawValue) => {
    let val = rawValue;
    if (val && !val.startsWith('#') && /^[0-9a-fA-F]{3,6}$/.test(val)) {
      val = `#${val}`;
    }
    onUpdateProfile({
      colors: {
        ...colors,
        [key]: val,
      },
    });
  };

  const conclusionIndex = Math.max(0, (sampleFixture.slides?.length || 1) - 1);

  return (
    <div className="profile-form-card">
      <div className="profile-form-header">
        <div>
          <h3>Identidade Visual</h3>
          <p className="profile-form-description">
            Configure seu logo, @, fonte e paleta de cores. As alterações são aplicadas automaticamente em todos os slides.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setLogoError('');
            onResetProfile?.();
          }}
        >
          Restaurar padrão
        </button>
      </div>

      <div className="profile-workspace">
        {/* Coluna de Controles */}
        <div className="profile-controls-col">
          {/* Logo */}
          <div className="form-group">
            <label htmlFor="profile-logo-input" className="form-label-row">
              <span>Logo da marca</span>
              <span className="form-hint">Redimensionado automaticamente (máx. 400 px)</span>
            </label>
            <div className="logo-upload-row">
              <input
                ref={fileInputRef}
                id="profile-logo-input"
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                onChange={handleFileChange}
                className="file-input"
              />
              {profile.logoDataUrl && (
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={handleRemoveLogo}
                >
                  Remover logo
                </button>
              )}
            </div>
            {profile.logoDataUrl && (
              <div className="logo-thumbnail-box">
                <img
                  src={profile.logoDataUrl}
                  alt="Prévia do logo"
                  className="logo-thumbnail-img"
                />
              </div>
            )}
            {logoError && (
              <p className="field-hint-error" role="alert">
                {logoError}
              </p>
            )}
          </div>

          {/* @ do Perfil e Fonte */}
          <div className="generate-options-grid">
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="profile-handle">@ do perfil (rodapé)</label>
                <span className="char-counter">{(profile.handle || '').length} / 40</span>
              </div>
              <input
                id="profile-handle"
                type="text"
                maxLength={40}
                value={profile.handle || ''}
                onChange={(e) => onUpdateProfile({ handle: e.target.value.slice(0, 40) })}
                placeholder="@seuperfil"
              />
            </div>

            <div className="form-group">
              <label htmlFor="profile-font" className="form-label-row">
                <span>Fonte tipográfica</span>
              </label>
              <select
                id="profile-font"
                value={profile.fontFamily || 'Inter'}
                onChange={(e) => onUpdateProfile({ fontFamily: e.target.value })}
                style={{ fontFamily: profile.fontFamily || 'Inter' }}
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Paleta de Cores */}
          <div className="form-group">
            <label className="form-label-row">
              <span>Paleta de cores</span>
              <span className="form-hint">Contraste atual Texto × Fundo: {ratio.toFixed(2)}:1</span>
            </label>
            <div className="color-pickers-grid">
              {COLOR_FIELDS.map(({ key, label }) => {
                const rawVal = colors[key] || DEFAULT_PROFILE.colors[key];
                const validPickerVal = parseHex(rawVal)
                  ? rawVal.startsWith('#') && rawVal.length === 7
                    ? rawVal
                    : DEFAULT_PROFILE.colors[key]
                  : DEFAULT_PROFILE.colors[key];

                return (
                  <div key={key} className="color-field-item">
                    <span className="color-field-label">{label}</span>
                    <div className="color-inputs-row">
                      <input
                        type="color"
                        aria-label={`Cor ${label}`}
                        value={validPickerVal}
                        onChange={(e) => handleColorChange(key, e.target.value.toUpperCase())}
                        className="color-swatch-input"
                      />
                      <input
                        type="text"
                        aria-label={`Hex ${label}`}
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

          {/* Aviso de Contraste Baixo */}
          {isLowContrast && (
            <div className="callout callout-warning contrast-warning-banner" role="alert">
              <strong>Contraste baixo: o texto pode ficar difícil de ler.</strong>
              <p>
                A razão de contraste entre o texto ({colors.text}) e o fundo ({colors.bg}) é de{' '}
                <strong>{ratio.toFixed(2)}:1</strong> (recomendado mínimo WCAG AA: 4.5:1).
              </p>
            </div>
          )}
        </div>

        {/* Coluna de Pré-visualização ao Vivo (Capa + Conclusão) */}
        <div className="profile-preview-col">
          <h4 className="profile-preview-title">Pré-visualização ao vivo (Capa e Conclusão)</h4>
          <div className="profile-previews-row">
            <SlidePreview
              content={sampleFixture}
              index={0}
              profile={profile}
              logoImg={logoImg}
            />
            <SlidePreview
              content={sampleFixture}
              index={conclusionIndex}
              profile={profile}
              logoImg={logoImg}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
