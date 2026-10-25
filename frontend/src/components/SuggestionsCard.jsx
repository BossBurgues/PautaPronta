import { useState, useEffect } from 'react';
import { getSuggestions, runSuggestions } from '../api.js';
import { load, save } from '../state/storage.js';

const DISMISSED_KEY = 'dismissedWeek';

function formatGeneratedDate(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    const weekday = d
      .toLocaleDateString('pt-BR', { weekday: 'long' })
      .replace(/-feira$/i, '');
    const dayMonth = d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
    return `geradas em ${weekday}, ${dayMonth}`;
  } catch {
    return '';
  }
}

export default function SuggestionsCard({
  config,
  onUseSuggestion,
  onSaveAsIdea,
}) {
  const hasToken = Boolean(config?.token && config.token.trim());

  const [loaded, setLoaded] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [dismissedWeek, setDismissedWeek] = useState(() =>
    load(DISMISSED_KEY, null),
  );
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');
  const [savedIndices, setSavedIndices] = useState({});

  useEffect(() => {
    if (!hasToken) {
      setLoaded(false);
      return;
    }

    let cancelled = false;

    getSuggestions(config)
      .then((res) => {
        if (cancelled) return;
        setGeneratedAt(res.generatedAt || null);
        setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : []);
        setLoaded(true);
      })
      .catch(() => {
        // Falha silenciosa ao montar a aba para não atrapalhar a tela Gerar
        if (!cancelled) {
          setLoaded(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasToken, config?.apiUrl, config?.token]);

  if (!hasToken || !loaded) {
    return null;
  }

  const isDismissed =
    Boolean(generatedAt) &&
    suggestions.length > 0 &&
    dismissedWeek === generatedAt;

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (!generatedAt) return;
    save(DISMISSED_KEY, generatedAt);
    setDismissedWeek(generatedAt);
  };

  const handleRunNow = async () => {
    if (running) return;
    setRunning(true);
    setRunError('');
    try {
      const res = await runSuggestions(config);
      setGeneratedAt(res.generatedAt || null);
      setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : []);
      setSavedIndices({});
    } catch (err) {
      setRunError(err.message || 'Não foi possível buscar novas sugestões agora.');
    } finally {
      setRunning(false);
    }
  };

  const handleSaveIdea = (item, idx) => {
    const links = Array.isArray(item.sources)
      ? item.sources.map((s) => s.url).filter(Boolean)
      : [];
    onSaveAsIdea?.({
      theme: item.theme,
      notes: item.angle,
      links,
    });
    setSavedIndices((prev) => ({ ...prev, [idx]: true }));
    setTimeout(() => {
      setSavedIndices((prev) => ({ ...prev, [idx]: false }));
    }, 2500);
  };

  return (
    <section className="suggestions-card" aria-label="Sugestões da semana">
      <div className="suggestions-card-header">
        <div className="suggestions-title-group">
          <h3>Sugestões da semana</h3>
          {generatedAt && (
            <span className="suggestions-date-badge">
              {formatGeneratedDate(generatedAt)}
            </span>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions-header-actions">
            <button
              type="button"
              className="btn-secondary btn-refresh-suggestions"
              onClick={handleRunNow}
              disabled={running}
              title="Usa 1 geração da cota do dia"
            >
              {running ? 'Buscando sugestões…' : 'Pedir novas sugestões'}
            </button>
            <button
              type="button"
              className="btn-secondary btn-dismiss-suggestions"
              onClick={handleDismiss}
              disabled={running}
            >
              Dispensar
            </button>
          </div>
        )}
      </div>

      {suggestions.length > 0 && (
        <p className="suggestions-quota-hint">
          Pedir novas sugestões sob demanda usa 1 geração da cota do dia.
        </p>
      )}

      {runError && (
        <div className="callout callout-warning suggestions-error" role="alert">
          <p>{runError}</p>
        </div>
      )}

      {suggestions.length === 0 ? (
        <div className="suggestions-empty-state">
          <p>Ainda não há sugestões. Elas chegam toda segunda de manhã.</p>
          <div className="suggestions-empty-actions">
            <button
              type="button"
              className="primary btn-request-suggestions-now"
              onClick={handleRunNow}
              disabled={running}
            >
              {running ? 'Buscando sugestões…' : 'Pedir agora'}
            </button>
            <span className="suggestions-quota-hint">
              Usa 1 geração da cota do dia
            </span>
          </div>
        </div>
      ) : (
        <div className="suggestions-items-grid">
          {suggestions.map((item, idx) => (
            <div key={idx} className="suggestion-item-box">
              <div className="suggestion-item-body">
                <h4 className="suggestion-theme">{item.theme}</h4>
                <p className="suggestion-angle">{item.angle}</p>

                {Array.isArray(item.sources) && item.sources.length > 0 && (
                  <ul className="suggestion-sources-list">
                    {item.sources.map((src, sIdx) => (
                      <li key={sIdx}>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {src.title || src.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="suggestion-item-actions">
                <button
                  type="button"
                  className="primary btn-use-suggestion"
                  onClick={() => onUseSuggestion?.(item)}
                >
                  Gerar agora
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-save-suggestion-idea"
                  onClick={() => handleSaveIdea(item, idx)}
                >
                  {savedIndices[idx] ? '✓ Salva em Ideias!' : 'Salvar como ideia'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
