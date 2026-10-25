function formatDatePtBr(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function HistoryList({
  history = [],
  currentDraft = null,
  onOpenInReview,
  onRemoveHistory,
  onClearHistory,
}) {
  const handleOpen = (entry) => {
    const hasDifferentDraft =
      currentDraft && JSON.stringify(currentDraft) !== JSON.stringify(entry.content);

    if (hasDifferentDraft) {
      const ok = window.confirm(
        'Substituir o rascunho atual na Revisão por esta versão do histórico?',
      );
      if (!ok) return;
    }

    onOpenInReview?.(entry);
  };

  const handleRemove = (entry) => {
    if (window.confirm(`Remover "${entry.theme}" do histórico?`)) {
      onRemoveHistory?.(entry.id);
    }
  };

  const handleClear = () => {
    if (window.confirm('Deseja realmente limpar todo o histórico de gerações?')) {
      onClearHistory?.();
    }
  };

  return (
    <div className="history-page-wrapper">
      <div className="history-top-bar">
        <div>
          <h2>Histórico de Gerações</h2>
          <p className="history-disclaimer-note">
            O histórico guarda a versão original gerada (até 20 mais recentes); edições posteriores ficam salvas no rascunho (`pp:draft`).
          </p>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            className="btn-danger-outline"
            onClick={handleClear}
          >
            Limpar histórico
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="empty-review-container">
          <h3>Nenhuma geração no histórico</h3>
          <p>
            Os últimos 20 carrosséis gerados (via API ou modo assistido) aparecerão listados aqui automaticamente.
          </p>
        </div>
      ) : (
        <div className="history-items-list">
          {history.map((entry) => {
            const slideCount = entry.content?.slides?.length || 0;
            const isAssisted = entry.mode === 'assistido';

            return (
              <div key={entry.id} className="history-item-card">
                <div className="history-item-main">
                  <div className="history-item-badges">
                    <span
                      className={`history-mode-badge ${
                        isAssisted ? 'mode-assistido' : 'mode-online'
                      }`}
                    >
                      {isAssisted ? 'assistido' : 'online'}
                    </span>
                    <span className="slide-count-badge">
                      {slideCount} {slideCount === 1 ? 'slide' : 'slides'}
                    </span>
                    <span className="history-date-text">
                      {formatDatePtBr(entry.createdAt)}
                    </span>
                  </div>
                  <h4 className="history-item-theme">
                    {entry.theme || entry.content?.topic || 'Carrossel sem tema'}
                  </h4>
                </div>

                <div className="history-item-actions">
                  <button
                    type="button"
                    className="primary btn-open-history"
                    onClick={() => handleOpen(entry)}
                  >
                    Abrir na revisão
                  </button>
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => handleRemove(entry)}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
