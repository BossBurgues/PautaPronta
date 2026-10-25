import { LIMITS, ROLES } from '../../../shared/schema.js';

export default function SlideEditor({
  slide,
  index,
  totalSlides,
  onUpdate,
  onRemove,
}) {
  const titleLen = slide?.title?.length || 0;
  const bodyLen = slide?.body?.length || 0;

  const isTitleOver = titleLen > LIMITS.titleMax;
  const isBodyOver = bodyLen > LIMITS.bodyMax;
  const canRemove = totalSlides > LIMITS.slidesMin;

  return (
    <div className="slide-editor-card">
      <div className="slide-editor-header">
        <span className="slide-badge">Slide {index + 1}</span>
        <div className="slide-editor-actions">
          <label className="slide-role-label">
            Papel:
            <select
              value={slide?.role || 'ponto'}
              onChange={(e) => onUpdate({ role: e.target.value })}
              className="slide-role-select"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </label>
          {canRemove && (
            <button
              type="button"
              className="btn-danger-outline"
              onClick={onRemove}
              title="Remover slide"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor={`slide-title-${index}`}>Título</label>
          <span className={`char-counter ${isTitleOver ? 'over-limit' : ''}`}>
            {titleLen}/{LIMITS.titleMax}
          </span>
        </div>
        <input
          id={`slide-title-${index}`}
          type="text"
          value={slide?.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Título objetivo do slide"
        />
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor={`slide-body-${index}`}>Corpo</label>
          <span className={`char-counter ${isBodyOver ? 'over-limit' : ''}`}>
            {bodyLen}/{LIMITS.bodyMax}
          </span>
        </div>
        <textarea
          id={`slide-body-${index}`}
          value={slide?.body || ''}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder="Texto principal do slide"
          rows={3}
        />
      </div>
    </div>
  );
}
