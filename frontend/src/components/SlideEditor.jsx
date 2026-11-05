import { useRef, useState } from 'react';
import { LIMITS, ROLES, stripMarks } from '../../../shared/schema.js';
import { fileToSlideImage } from '../canvas/images.js';

const ROLE_LABELS = { capa: 'Capa', contexto: 'Contexto', ponto: 'Conteúdo', conclusao: 'Conclusão' };

const LAYOUT_LABELS = {
  texto: 'Só texto',
  destaque: 'Número em destaque',
  passos: 'Passos numerados',
  'imagem-topo': 'Imagem em cima',
  'imagem-lado': 'Imagem ao lado',
  'imagem-fundo': 'Imagem de fundo',
};

// Capa e conclusão têm composição própria; infográficos ficam nos slides do meio.
function layoutsFor(role) {
  if (role === 'conclusao') return ['texto'];
  if (role === 'capa') return ['texto', 'imagem-fundo', 'imagem-topo', 'imagem-lado'];
  return Object.keys(LAYOUT_LABELS);
}

/** Envolve o trecho selecionado com ** (negrito). Sem seleção, insere **negrito** no cursor. */
function toggleBold(textarea, value, onChange) {
  if (!textarea) return;
  const { selectionStart: a, selectionEnd: b } = textarea;
  const selected = value.slice(a, b);
  const isBold = /^\*\*[\s\S]+\*\*$/.test(selected);
  const replacement = isBold ? selected.slice(2, -2) : `**${selected || 'negrito'}**`;
  onChange(value.slice(0, a) + replacement + value.slice(b));
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(a, a + replacement.length);
  });
}

function Counter({ value, max }) {
  const len = stripMarks(value).length;
  return <span className={`char-counter ${len > max ? 'over-limit' : ''}`}>{len}/{max}</span>;
}

function ImageField({ image, onChange }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const src = await fileToSlideImage(file);
      onChange({ src, focusX: 50, focusY: 50, zoom: 1 });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const set = (patch) => onChange({ ...image, ...patch });

  return (
    <div className="image-field">
      <div className="image-field-actions">
        <button type="button" className="btn-secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Carregando…' : image ? 'Trocar imagem' : 'Inserir imagem'}
        </button>
        {image && (
          <button type="button" className="btn-danger-outline" onClick={() => onChange(undefined)}>
            Remover imagem
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} hidden />
      </div>
      {error && <p className="field-error">{error}</p>}
      {image ? (
        <fieldset className="crop-controls">
          <legend>Recorte e enquadramento</legend>
          <label>
            Zoom
            <input type="range" min="1" max="3" step="0.05" value={image.zoom} onChange={(e) => set({ zoom: Number(e.target.value) })} />
          </label>
          <label>
            Horizontal
            <input type="range" min="0" max="100" step="1" value={image.focusX} onChange={(e) => set({ focusX: Number(e.target.value) })} />
          </label>
          <label>
            Vertical
            <input type="range" min="0" max="100" step="1" value={image.focusY} onChange={(e) => set({ focusY: Number(e.target.value) })} />
          </label>
          <button type="button" className="btn-link" onClick={() => set({ focusX: 50, focusY: 50, zoom: 1 })}>
            Centralizar
          </button>
        </fieldset>
      ) : (
        <p className="field-hint">PNG, JPG ou WebP. A ferramenta não gera imagens: use uma foto, ilustração ou print seu.</p>
      )}
    </div>
  );
}

function StepsField({ steps, onChange }) {
  const list = steps?.length ? steps : [{ label: '', text: '' }, { label: '', text: '' }];
  const update = (i, patch) => onChange(list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  return (
    <div className="steps-field">
      {list.map((step, i) => (
        <div key={i} className="step-row">
          <span className="step-index">{String(i + 1).padStart(2, '0')}</span>
          <div className="step-inputs">
            <input
              type="text"
              value={step.label}
              maxLength={60}
              placeholder="Rótulo curto (ex.: Inventário)"
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <input
              type="text"
              value={step.text}
              placeholder="O que fazer neste passo"
              onChange={(e) => update(i, { text: e.target.value })}
            />
          </div>
          {list.length > LIMITS.stepsMin && (
            <button type="button" className="btn-danger-icon" title="Remover passo" onClick={() => onChange(list.filter((_, j) => j !== i))}>
              ✕
            </button>
          )}
        </div>
      ))}
      {list.length < LIMITS.stepsMax && (
        <button type="button" className="btn-secondary" onClick={() => onChange([...list, { label: '', text: '' }])}>
          + Adicionar passo
        </button>
      )}
    </div>
  );
}

export default function SlideEditor({ slide, index, totalSlides, onUpdate, onRemove, onMove }) {
  const bodyRef = useRef(null);
  const canRemove = totalSlides > LIMITS.slidesMin;
  const role = slide?.role || 'ponto';
  const options = layoutsFor(role);
  const layout = options.includes(slide?.layout) ? slide.layout : 'texto';
  const id = `slide-${index}`;

  return (
    <div className="slide-editor-card">
      <div className="slide-editor-header">
        <span className="slide-badge">Slide {index + 1}</span>
        <div className="slide-editor-actions">
          <div className="move-buttons" role="group" aria-label={`Mover slide ${index + 1}`}>
            <button type="button" className="btn-icon" onClick={() => onMove(-1)} disabled={index === 0} title="Mover para cima" aria-label="Mover para cima">
              ↑
            </button>
            <button type="button" className="btn-icon" onClick={() => onMove(1)} disabled={index === totalSlides - 1} title="Mover para baixo" aria-label="Mover para baixo">
              ↓
            </button>
          </div>
          {canRemove && (
            <button type="button" className="btn-danger-outline" onClick={onRemove} title="Remover slide">
              Remover
            </button>
          )}
        </div>
      </div>

      <div className="slide-options-grid">
        <label className="slide-option">
          <span>Papel</span>
          <select value={role} onChange={(e) => onUpdate({ role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="slide-option">
          <span>Composição</span>
          <select value={layout} onChange={(e) => onUpdate({ layout: e.target.value })}>
            {options.map((l) => (
              <option key={l} value={l}>
                {LAYOUT_LABELS[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="slide-option">
          <span>Fundo</span>
          <select
            value={slide?.theme || 'auto'}
            onChange={(e) => onUpdate({ theme: e.target.value === 'auto' ? undefined : e.target.value })}
            disabled={layout === 'imagem-fundo'}
          >
            <option value="auto">Automático</option>
            <option value="claro">Claro</option>
            <option value="escuro">Escuro</option>
          </select>
        </label>
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor={`${id}-title`}>Título</label>
          <Counter value={slide?.title} max={LIMITS.titleMax} />
        </div>
        <input
          id={`${id}-title`}
          type="text"
          value={slide?.title || ''}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Chamada curta e forte"
        />
      </div>

      {layout === 'destaque' && (
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor={`${id}-stat`}>Número em destaque</label>
            <span className="char-counter">{(slide?.stat || '').length}/{LIMITS.statMax}</span>
          </div>
          <input
            id={`${id}-stat`}
            type="text"
            value={slide?.stat || ''}
            onChange={(e) => onUpdate({ stat: e.target.value })}
            placeholder="Ex.: 40%"
          />
        </div>
      )}

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor={`${id}-body`}>{layout === 'passos' ? 'Subtítulo' : 'Texto'}</label>
          <div className="label-tools">
            <button
              type="button"
              className="btn-bold"
              title="Negrito: selecione palavras e clique (ou escreva **assim**)"
              onClick={() => toggleBold(bodyRef.current, slide?.body || '', (body) => onUpdate({ body }))}
            >
              <strong>B</strong> Negrito
            </button>
            <Counter value={slide?.body} max={LIMITS.bodyMax} />
          </div>
        </div>
        <textarea
          ref={bodyRef}
          id={`${id}-body`}
          value={slide?.body || ''}
          onChange={(e) => onUpdate({ body: e.target.value })}
          placeholder="Texto principal do slide"
          rows={3}
        />
      </div>

      {layout === 'passos' && (
        <div className="form-group">
          <span className="form-label-row">Passos (2 a 4)</span>
          <StepsField steps={slide?.steps} onChange={(steps) => onUpdate({ steps })} />
        </div>
      )}

      {layout.startsWith('imagem-') && (
        <div className="form-group">
          <span className="form-label-row">Imagem</span>
          <ImageField image={slide?.image} onChange={(image) => onUpdate({ image })} />
        </div>
      )}

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor={`${id}-source`}>Fonte deste slide (opcional)</label>
          <span className="char-counter">{(slide?.source || '').length}/{LIMITS.sourceLineMax}</span>
        </div>
        <input
          id={`${id}-source`}
          type="text"
          value={slide?.source || ''}
          onChange={(e) => onUpdate({ source: e.target.value })}
          placeholder="Ex.: Fonte: McKinsey, The state of AI in 2026 [1]"
        />
      </div>
    </div>
  );
}
