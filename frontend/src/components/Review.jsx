import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateContent, LIMITS } from '../../../shared/schema.js';
import sampleFixture from '../../../shared/fixtures/exemplo.json';
import SlidePreview from './SlidePreview.jsx';
import SlideEditor from './SlideEditor.jsx';
import CaptionEditor from './CaptionEditor.jsx';
import SourcesList from './SourcesList.jsx';
import ExportPanel from './ExportPanel.jsx';
import { getRenderSlides, loadSlideAssets } from '../canvas/renderSlide.js';

export default function Review({
  content,
  setContent,
  updateSlide,
  updateField,
  addSlide,
  removeSlide,
  moveSlide,
  saveFailed = false,
  profile,
  logoImg,
  usedSources = [],
  feedErrors = [],
}) {
  // Em telas estreitas as colunas empilham; este seletor alterna entre editar e ver a prévia.
  const [mobileView, setMobileView] = useState('editar');
  const switchRef = useRef(null);

  const showMobileView = (view) => {
    setMobileView(view);
    switchRef.current?.scrollIntoView({ block: 'start' });
  };

  // Imagens dos slides e logo carregados uma vez para todas as prévias.
  const [assets, setAssets] = useState(null);
  useEffect(() => {
    let cancelled = false;
    loadSlideAssets(content, profile, logoImg).then((a) => {
      if (!cancelled) setAssets(a);
    });
    return () => {
      cancelled = true;
    };
  }, [content, profile, logoImg]);

  // Slides cujo texto não coube nem no tamanho mínimo de letra (informado pela prévia).
  const [overflowing, setOverflowing] = useState({});
  const handleOverflow = useCallback((i, value) => {
    setOverflowing((prev) => (prev[i] === value ? prev : { ...prev, [i]: value }));
  }, []);

  const renderList = useMemo(() => getRenderSlides(content), [content]);

  const validation = useMemo(() => {
    if (!content) return { valid: false, errors: [], warnings: [] };
    const result = validateContent(content);
    const extra = renderList
      .filter((item, i) => overflowing[i])
      .map((item, i) =>
        item.kind === 'fontes'
          ? 'Slide de fontes: há referências demais para uma página; as que não couberam ficam só na legenda do LinkedIn.'
          : `Slide ${item.index + 1}: o texto não coube nem no tamanho mínimo de letra. Resuma o título ou o texto.`,
      );
    return { ...result, warnings: [...result.warnings, ...extra] };
  }, [content, renderList, overflowing]);

  if (!content) {
    return (
      <div className="empty-review-container">
        <h3>Nenhum carrossel em edição</h3>
        <p>Gere um novo carrossel na aba Gerar ou carregue um exemplo para visualizar e editar os slides.</p>
        <button
          type="button"
          className="primary"
          onClick={() => setContent(sampleFixture)}
        >
          Carregar exemplo
        </button>
      </div>
    );
  }

  const slides = content.slides || [];
  const totalSlides = slides.length;
  const canAddSlide = totalSlides < LIMITS.slidesMax;

  return (
    <div className="review-container">
      <div className="review-top-bar">
        <div className="review-theme-info">
          <h2>{content.topic || 'Carrossel sem tema'}</h2>
          <span className="slide-count-badge">
            {totalSlides} {totalSlides === 1 ? 'slide' : 'slides'} (limite {LIMITS.slidesMin}–{LIMITS.slidesMax})
          </span>
        </div>
        <div className="review-top-actions">
          <button
            type="button"
            className="btn-danger-outline"
            onClick={() => {
              if (window.confirm('Descartar este rascunho? As edições não salvas no histórico serão perdidas.')) {
                setContent(null);
              }
            }}
          >
            Descartar rascunho
          </button>
          <button
            type="button"
            className="primary"
            onClick={addSlide}
            disabled={!canAddSlide}
            title={canAddSlide ? 'Inserir novo slide' : `Limite máximo atingido (${LIMITS.slidesMax})`}
          >
            + Adicionar slide
          </button>
        </div>
      </div>

      {/* Visual só deste carrossel: por cima do padrão definido em Configurações */}
      <div className="carousel-style-bar" role="group" aria-label="Visual deste carrossel">
        <span className="carousel-style-title">Visual deste carrossel</span>
        <label>
          Fundos
          <select
            value={content.style?.theme || 'padrao'}
            onChange={(e) => updateField('style', { ...content.style, theme: e.target.value })}
          >
            <option value="padrao">Padrão (capa e conclusão escuras)</option>
            <option value="escuro">Todos escuros</option>
            <option value="claro">Todos claros</option>
          </select>
        </label>
        <label>
          Destaques
          <select
            value={content.style?.highlight || 'perfil'}
            onChange={(e) => updateField('style', { ...content.style, highlight: e.target.value })}
          >
            <option value="perfil">Como em Configurações</option>
            <option value="accent">Cor principal</option>
            <option value="accent2">Cor secundária</option>
          </select>
        </label>
        <span className="carousel-style-hint">O fundo escolhido em cada slide continua valendo.</span>
      </div>

      {/* Bloco recolhível de fontes consultadas pela API */}
      {(usedSources.length > 0 || feedErrors.length > 0) && (
        <details className="consulted-sources-card">
          <summary className="consulted-sources-summary">
            <span>
              🔍 <strong>Fontes consultadas pela IA</strong> ({usedSources.length}{' '}
              {usedSources.length === 1 ? 'fonte utilizada' : 'fontes utilizadas'})
            </span>
            <span className="summary-toggle-icon">▼</span>
          </summary>
          <div className="consulted-sources-content">
            {usedSources.length > 0 && (
              <ul className="consulted-sources-list">
                {usedSources.map((src, i) => (
                  <li key={i}>
                    {/^https?:\/\//i.test(src.url || '') ? (
                      <a href={src.url} target="_blank" rel="noopener noreferrer">
                        {src.title || src.url}
                      </a>
                    ) : (
                      <span>{src.title || src.url}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {feedErrors.length > 0 && (
              <div className="feed-errors-box">
                <strong>Não consegui ler:</strong>
                <ul>
                  {feedErrors.map((err, i) => (
                    <li key={i}>
                      <code>{typeof err === 'object' ? err.url : err}</code>
                      {typeof err === 'object' && (err.message || err.error)
                        ? ` — ${err.message || err.error}`
                        : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
      )}

      {saveFailed && (
        <div className="callout callout-warning" role="alert">
          <strong>O navegador ficou sem espaço para guardar este rascunho.</strong> Isso costuma acontecer com
          várias imagens grandes. Exporte os arquivos agora ou use imagens menores; ao fechar a página, as últimas
          mudanças podem se perder.
        </div>
      )}

      {/* Bloco de Avisos e Erros de Validação */}
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="validation-panel">
          {validation.errors.length > 0 && (
            <div className="validation-section validation-errors">
              <strong>Problemas estruturais:</strong>
              <ul>
                {validation.errors.map((err, i) => (
                  <li key={`err-${i}`}>{err}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div className="validation-section validation-warnings">
              <strong>Avisos de revisão:</strong>
              <ul>
                {validation.warnings.map((warn, i) => (
                  <li key={`warn-${i}`}>{warn}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Painel de Exportação */}
      <ExportPanel
        content={content}
        profile={profile}
        logoImg={logoImg}
        validation={validation}
      />

      <div ref={switchRef} className="review-mobile-switch" role="group" aria-label="Modo de visualização">
        <button
          type="button"
          aria-pressed={mobileView === 'editar'}
          className={mobileView === 'editar' ? 'active' : ''}
          onClick={() => showMobileView('editar')}
        >
          Editar
        </button>
        <button
          type="button"
          aria-pressed={mobileView === 'previa'}
          className={mobileView === 'previa' ? 'active' : ''}
          onClick={() => showMobileView('previa')}
        >
          Prévia ({renderList.length})
        </button>
      </div>

      {/* Grade de 2 Colunas */}
      <div className={`review-workspace mobile-view-${mobileView}`}>
        {/* Coluna Esquerda: Formulários de Edição */}
        <div className="review-editor-column">
          <div className="editors-section">
            <h3 className="section-title">Slides ({totalSlides})</h3>
            <div className="slides-editor-list">
              {slides.map((slide, index) => (
                <SlideEditor
                  key={index}
                  slide={slide}
                  index={index}
                  totalSlides={totalSlides}
                  onUpdate={(patch) => updateSlide(index, patch)}
                  onRemove={() => removeSlide(index)}
                  onMove={(delta) => moveSlide(index, delta)}
                />
              ))}
            </div>
          </div>

          <CaptionEditor
            captionLinkedin={content.caption_linkedin || ''}
            captionInstagram={content.caption_instagram || ''}
            cta={content.cta || ''}
            hashtags={content.hashtags || []}
            onUpdateField={updateField}
          />

          <SourcesList
            sources={content.sources || []}
            onUpdateSources={(sources) => updateField('sources', sources)}
          />
        </div>

        {/* Coluna Direita: Grade de Previews Canvas */}
        <div className="review-preview-column">
          <h3 className="section-title">Visualização ao vivo ({renderList.length})</h3>
          <div className="slides-preview-grid">
            {assets &&
              renderList.map((item, i) => (
                <SlidePreview
                  key={i}
                  item={item}
                  position={i + 1}
                  total={renderList.length}
                  content={content}
                  profile={profile}
                  assets={assets}
                  logoImg={logoImg}
                  onOverflow={handleOverflow}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
