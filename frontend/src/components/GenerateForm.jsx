import { useState, useEffect, useRef } from 'react';
import { generate } from '../api.js';
import AssistedPanel from './AssistedPanel.jsx';
import SuggestionsCard from './SuggestionsCard.jsx';
import { applyVisualFormat } from '../state/draftOps.js';
import { DEFAULT_TONE, DEFAULT_AUDIENCE, DEFAULT_VISUAL_FORMAT } from '../../../shared/prompt.js';

// Rótulos das opções (as chaves são as mesmas que o Worker aceita).
const AUDIENCE_LABELS = {
  gestores: 'Gestores e líderes',
  executivos: 'Executivos e alta gestão',
  pesquisadores: 'Pesquisadores e academia',
  startups: 'Empreendedores e startups',
  geral: 'Público geral',
};
const TONE_LABELS = {
  'profissional-acessivel': 'Profissional, acessível e direto',
  'profissional-didatico': 'Profissional e didático',
  'direto-pratico': 'Direto e prático',
  analitico: 'Analítico, com dados',
};
const FORMAT_LABELS = {
  texto: 'Texto',
  infografico: 'Infográfico (números e passos)',
  'texto-imagem': 'Texto + imagem',
};

function SelectField({ id, label, value, onChange, options, disabled }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label-row">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {Object.entries(options).map(([key, text]) => (
          <option key={key} value={key}>{text}</option>
        ))}
      </select>
    </div>
  );
}

export default function GenerateForm({
  config,
  onSuccess,
  onSaveAsIdea,
  onNavigateToConfig,
  initialTheme = '',
}) {
  const defaults = config?.defaults || {};
  const [theme, setTheme] = useState(initialTheme);
  const [formats, setFormats] = useState(defaults.formats || ['linkedin', 'instagram']);
  const [slideCount, setSlideCount] = useState(defaults.slideCount || 5);
  const [useWebSearch, setUseWebSearch] = useState(defaults.useWebSearch || false);
  const [tone, setTone] = useState(defaults.tone || DEFAULT_TONE);
  const [audience, setAudience] = useState(defaults.audience || DEFAULT_AUDIENCE);
  const [visualFormat, setVisualFormat] = useState(defaults.visualFormat || DEFAULT_VISUAL_FORMAT);

  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [showAssisted, setShowAssisted] = useState(false);
  const [savedIdeaFeedback, setSavedIdeaFeedback] = useState(false);
  const submitBtnRef = useRef(null);

  useEffect(() => {
    if (initialTheme !== undefined && initialTheme !== '') {
      setTheme(initialTheme);
    }
  }, [initialTheme]);

  useEffect(() => {
    if (defaults.slideCount) setSlideCount(defaults.slideCount);
    if (Array.isArray(defaults.formats)) setFormats(defaults.formats);
    if (typeof defaults.useWebSearch === 'boolean') setUseWebSearch(defaults.useWebSearch);
    if (defaults.tone) setTone(defaults.tone);
  }, [defaults.slideCount, defaults.formats, defaults.useWebSearch, defaults.tone]);

  const hasToken = Boolean(config?.token && config.token.trim());
  const themeTrimmed = theme.trim();
  const themeLength = themeTrimmed.length;
  const isThemeValid = themeLength >= 3 && themeLength <= 200;

  const handleFormatToggle = (fmt) => {
    if (formats.includes(fmt)) {
      if (formats.length > 1) {
        setFormats(formats.filter((f) => f !== fmt));
      }
    } else {
      setFormats([...formats, fmt]);
    }
  };

  const handleSaveAsIdea = () => {
    if (!isThemeValid) return;
    onSaveAsIdea?.({ theme: themeTrimmed });
    setSavedIdeaFeedback(true);
    setTimeout(() => setSavedIdeaFeedback(false), 2500);
  };

  const handleUseSuggestion = (item) => {
    const combined = `${item.theme || ''} — ${item.angle || ''}`.trim().slice(0, 200);
    setTheme(combined);
    setTimeout(() => {
      submitBtnRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isThemeValid || status === 'loading') return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await generate(config, {
        theme: themeTrimmed,
        slideCount,
        formats,
        useWebSearch,
        tone,
        audience,
        visualFormat,
      });

      setStatus('idle');
      onSuccess?.({
        content: applyVisualFormat(res.content, visualFormat),
        theme: themeTrimmed || res.content?.topic,
        mode: 'online',
        usedSources: res.usedSources || [],
        feedErrors: res.feedErrors || [],
        warnings: res.warnings || [],
      });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'Erro ao gerar carrossel.');

      if (err.fallbackToAssisted) {
        setShowAssisted(true);
      }
    }
  };

  // Se o modo assistido estiver ativado (manual ou por fallback de cota/erro)
  if (showAssisted) {
    const feedUrls = (config?.feeds || [])
      .filter((f) => f.enabled)
      .map((f) => f.url);

    return (
      <div className="generate-page-wrapper">
        {errorMessage && (
          <div className="callout callout-warning" role="alert">
            <p><strong>Atenção:</strong> {errorMessage}</p>
            <p className="callout-hint">Você foi direcionado para o modo assistido abaixo.</p>
          </div>
        )}
        <AssistedPanel
          theme={themeTrimmed || 'Tema do carrossel'}
          slideCount={slideCount}
          tone={tone}
          audience={audience}
          visualFormat={visualFormat}
          feedUrls={feedUrls}
          sites={config?.referenceSites || []}
          onSuccess={(content) => {
            setShowAssisted(false);
            onSuccess?.({
              content: applyVisualFormat(content, visualFormat),
              theme: themeTrimmed || content?.topic,
              mode: 'assistido',
              usedSources: [],
              feedErrors: [],
              warnings: [],
            });
          }}
          onBack={() => {
            setShowAssisted(false);
            setStatus('idle');
            setErrorMessage('');
          }}
        />
      </div>
    );
  }

  return (
    <div className="generate-page-wrapper">
      <SuggestionsCard
        config={config}
        onUseSuggestion={handleUseSuggestion}
        onSaveAsIdea={onSaveAsIdea}
      />
      <div className="generate-form-card">
        <div className="generate-form-header">
          <h2>Criar novo carrossel</h2>
          <p className="generate-subtitle">
            Informe o tema desejado para pesquisar referências e gerar os slides automaticamente.
          </p>
        </div>

        {/* Estado de Erro com Ações de Recuperação */}
        {status === 'error' && (
          <div className="error-alert-banner" role="alert">
            <div className="error-alert-content">
              <strong>Não foi possível gerar:</strong>
              <p>{errorMessage}</p>
            </div>
            <div className="error-alert-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStatus('idle')}
              >
                Tentar de novo
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => setShowAssisted(true)}
              >
                Usar modo assistido
              </button>
            </div>
          </div>
        )}

        {/* Aviso se não houver token configurado */}
        {!hasToken && (
          <div className="callout callout-info" role="note">
            <div className="callout-content">
              <strong>Falta o token de acesso</strong>
              <p>
                Para gerar direto pela ferramenta, informe o token em Configurações. Sem ele, o modo
                assistido funciona normalmente.
              </p>
            </div>
            <div className="callout-actions">
              <button
                type="button"
                className="primary"
                onClick={onNavigateToConfig}
              >
                Ir para Configurações
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAssisted(true)}
              >
                Abrir modo assistido
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="generate-form-body">
          {/* Campo Tema */}
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="gen-theme">Tema do carrossel *</label>
              <span
                className={`char-counter ${
                  themeLength > 200 || (themeLength > 0 && themeLength < 3)
                    ? 'over-limit'
                    : ''
                }`}
              >
                {themeLength} / 200
              </span>
            </div>
            <textarea
              id="gen-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex.: Transformação digital em pequenas empresas, Arquitetura de microsserviços, etc."
              rows={3}
              required
              disabled={status === 'loading'}
            />
            {themeLength > 0 && themeLength < 3 && (
              <span className="field-hint-error">Mínimo de 3 caracteres.</span>
            )}
          </div>

          {/* Opções em Grid */}
          <div className="generate-options-grid">
            {/* Formatos */}
            <div className="form-group">
              <label className="form-label-row">Formatos de publicação</label>
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formats.includes('linkedin')}
                    onChange={() => handleFormatToggle('linkedin')}
                    disabled={status === 'loading'}
                  />
                  <span>LinkedIn</span>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formats.includes('instagram')}
                    onChange={() => handleFormatToggle('instagram')}
                    disabled={status === 'loading'}
                  />
                  <span>Instagram</span>
                </label>
              </div>
            </div>

            {/* Número de slides */}
            <div className="form-group">
              <label htmlFor="gen-slide-count" className="form-label-row">
                Nº de slides
              </label>
              <select
                id="gen-slide-count"
                value={slideCount}
                onChange={(e) => setSlideCount(Number(e.target.value))}
                disabled={status === 'loading'}
              >
                <option value={4}>4 slides</option>
                <option value={5}>5 slides (recomendado)</option>
                <option value={6}>6 slides</option>
                <option value={7}>7 slides</option>
              </select>
            </div>
          </div>

          {/* Público, tom e formato visual */}
          <div className="generate-options-grid three">
            <SelectField id="gen-audience" label="Público" value={audience} onChange={setAudience} options={AUDIENCE_LABELS} disabled={status === 'loading'} />
            <SelectField id="gen-tone" label="Tom" value={tone} onChange={setTone} options={TONE_LABELS} disabled={status === 'loading'} />
            <SelectField id="gen-format" label="Formato visual" value={visualFormat} onChange={setVisualFormat} options={FORMAT_LABELS} disabled={status === 'loading'} />
          </div>
          {visualFormat === 'texto-imagem' && (
            <p className="field-hint">
              Os slides já vêm com espaço para imagem. Você insere e recorta as imagens na aba Revisar.
            </p>
          )}

          {/* Toggle Buscar na web */}
          <div className="form-group toggle-group-box">
            <label className="checkbox-label toggle-label">
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                disabled={status === 'loading'}
              />
              <span className="toggle-text">Buscar na web</span>
            </label>
            <span className="toggle-hint">
              Pesquisa fontes recentes nos seus sites de referência. No plano gratuito do Gemini ela costuma não ter cota: aí o carrossel é feito só com os feeds. Para um tema bem específico, prefira o modo assistido.
            </span>
          </div>

          {/* Barra de Ações */}
          <div className="generate-form-actions">
            {hasToken ? (
              <button
                ref={submitBtnRef}
                type="submit"
                className="primary btn-generate-submit"
                disabled={!isThemeValid || status === 'loading'}
              >
                {status === 'loading'
                  ? 'Pesquisando fontes e escrevendo… pode levar até 1 minuto'
                  : 'Gerar carrossel'}
              </button>
            ) : null}

            <button
              type="button"
              className="btn-secondary btn-switch-assisted"
              onClick={() => setShowAssisted(true)}
              disabled={status === 'loading'}
            >
              Usar modo assistido
            </button>

            <button
              type="button"
              className="btn-secondary btn-save-idea"
              onClick={handleSaveAsIdea}
              disabled={!isThemeValid || status === 'loading'}
              title="Salvar o tema atual no Banco de Ideias sem gerar agora"
            >
              {savedIdeaFeedback ? '✓ Ideia salva!' : 'Salvar como ideia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
