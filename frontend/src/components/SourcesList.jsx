export default function SourcesList({ sources = [], onUpdateSources }) {
  const handleUpdate = (index, patch) => {
    const next = sources.map((s, i) => (i === index ? { ...s, ...patch } : s));
    onUpdateSources(next);
  };

  const handleRemove = (index) => {
    const next = sources.filter((_, i) => i !== index);
    onUpdateSources(next);
  };

  const handleAdd = () => {
    onUpdateSources([...sources, { title: '', url: '' }]);
  };

  return (
    <div className="sources-list-card">
      <div className="sources-header">
        <h3 className="section-title">Fontes de Referência</h3>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleAdd}
          title="Adicionar fonte de referência"
        >
          + Adicionar fonte
        </button>
      </div>

      {sources.length === 0 ? (
        <p className="empty-hint">Nenhuma fonte cadastrada (mínimo de 2 recomendado).</p>
      ) : (
        <div className="sources-items">
          {sources.map((source, index) => (
            <div key={index} className="source-row">
              <div className="source-inputs">
                <div className="source-title-row">
                  <input
                    type="text"
                    value={source.title || ''}
                    onChange={(e) => handleUpdate(index, { title: e.target.value })}
                    placeholder="Título da fonte ou matéria"
                    className="source-title-input"
                  />
                  {source.verified === false && (
                    <span
                      className="badge-verify"
                      title="Esta URL não foi encontrada nas fontes consultadas. Confira antes de publicar."
                    >
                      verificar
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={source.url || ''}
                  onChange={(e) => handleUpdate(index, { url: e.target.value })}
                  placeholder="https://exemplo.com/artigo"
                  className="source-url-input"
                />
              </div>
              <button
                type="button"
                className="btn-danger-icon"
                onClick={() => handleRemove(index)}
                title="Remover fonte"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
