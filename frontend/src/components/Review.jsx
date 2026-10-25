import { useMemo, useRef, useState } from 'react';
import { validateContent, LIMITS } from '../../../shared/schema.js';
import sampleFixture from '../../../shared/fixtures/exemplo.json';
import SlidePreview from './SlidePreview.jsx';
import SlideEditor from './SlideEditor.jsx';
import CaptionEditor from './CaptionEditor.jsx';
import SourcesList from './SourcesList.jsx';
import ExportPanel from './ExportPanel.jsx';

export default function Review({
  content,
  setContent,
  updateSlide,
  updateField,
  addSlide,
  removeSlide,
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

  const validation = useMemo(() => {
    if (!content) return { valid: false, errors: [], warnings: [] };
    return validateContent(content);
  }, [content]);

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
            className="primary"
            onClick={addSlide}
            disabled={!canAddSlide}
            title={canAddSlide ? 'Inserir novo slide' : `Limite máximo atingido (${LIMITS.slidesMax})`}
          >
            + Adicionar slide
          </button>
        </div>
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
                    <a href={src.url} target="_blank" rel="noopener noreferrer">
                      {src.title || src.url}
                    </a>
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
                      {typeof err === 'object' && err.error ? ` — ${err.error}` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </details>
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
          Prévia ({totalSlides})
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
          <h3 className="section-title">Visualização ao Vivo ({totalSlides})</h3>
          <div className="slides-preview-grid">
            {slides.map((_, index) => (
              <SlidePreview
                key={index}
                content={content}
                index={index}
                profile={profile}
                logoImg={logoImg}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
