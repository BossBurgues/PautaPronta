import { useState, useMemo } from 'react';
import { normalizeLinks } from '../state/useIdeas.js';

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

export default function IdeaBank({
  ideas = [],
  onAddIdea,
  onUpdateIdea,
  onRemoveIdea,
  onGenerateFromIdea,
}) {
  const [theme, setTheme] = useState('');
  const [notes, setNotes] = useState('');
  const [linksText, setLinksText] = useState('');
  const [formError, setFormError] = useState('');

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('todas');

  // Estado de edição inline
  const [editingId, setEditingId] = useState(null);
  const [editTheme, setEditTheme] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLinksText, setEditLinksText] = useState('');
  const [editStatus, setEditStatus] = useState('nova');

  const counts = useMemo(() => {
    let novas = 0;
    let usadas = 0;
    for (const item of ideas) {
      if (item.status === 'usada') usadas += 1;
      else novas += 1;
    }
    return { novas, usadas };
  }, [ideas]);

  const filteredIdeas = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return ideas.filter((item) => {
      if (statusFilter !== 'todas' && item.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      const inTheme = (item.theme || '').toLowerCase().includes(q);
      const inNotes = (item.notes || '').toLowerCase().includes(q);
      return inTheme || inNotes;
    });
  }, [ideas, searchText, statusFilter]);

  const themeTrimmed = theme.trim();
  const isThemeValid = themeTrimmed.length >= 3 && themeTrimmed.length <= 200;

  const handleCreate = (e) => {
    e.preventDefault();
    setFormError('');

    if (!isThemeValid) {
      setFormError('O tema deve ter entre 3 e 200 caracteres.');
      return;
    }

    const rawLines = linksText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const validLinks = normalizeLinks(rawLines);

    if (rawLines.length > 0 && validLinks.length < rawLines.length) {
      setFormError('Todos os links devem ser URLs válidas iniciadas por http:// ou https://.');
      return;
    }

    onAddIdea({
      theme: themeTrimmed,
      notes: notes.trim(),
      links: validLinks,
    });

    setTheme('');
    setNotes('');
    setLinksText('');
  };

  const startEdit = (idea) => {
    setEditingId(idea.id);
    setEditTheme(idea.theme || '');
    setEditNotes(idea.notes || '');
    setEditLinksText((idea.links || []).join('\n'));
    setEditStatus(idea.status || 'nova');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = (id) => {
    const cleanTheme = editTheme.trim();
    if (cleanTheme.length < 3 || cleanTheme.length > 200) {
      return;
    }
    onUpdateIdea(id, {
      theme: cleanTheme,
      notes: editNotes.trim(),
      links: normalizeLinks(editLinksText),
      status: editStatus,
    });
    setEditingId(null);
  };

  const handleDelete = (idea) => {
    if (window.confirm(`Excluir a ideia "${idea.theme}"?`)) {
      onRemoveIdea(idea.id);
    }
  };

  return (
    <div className="idea-bank-wrapper">
      {/* Formulário de Nova Ideia */}
      <div className="idea-form-card">
        <div className="idea-form-header">
          <div>
            <h2>Banco de Ideias</h2>
            <p className="generate-subtitle">
              Guarde temas, referências e anotações para transformar em carrosséis quando quiser.
            </p>
          </div>
          <span className="ideas-counter-badge">
            {counts.novas} {counts.novas === 1 ? 'nova' : 'novas'} · {counts.usadas}{' '}
            {counts.usadas === 1 ? 'usada' : 'usadas'}
          </span>
        </div>

        {formError && (
          <div className="callout callout-warning" role="alert">
            <p>{formError}</p>
          </div>
        )}

        <form onSubmit={handleCreate} className="idea-create-form">
          <div className="form-group">
            <div className="form-label-row">
              <label htmlFor="idea-theme">Tema da pauta *</label>
              <span
                className={`char-counter ${
                  themeTrimmed.length > 200 || (themeTrimmed.length > 0 && themeTrimmed.length < 3)
                    ? 'over-limit'
                    : ''
                }`}
              >
                {themeTrimmed.length} / 200
              </span>
            </div>
            <input
              id="idea-theme"
              type="text"
              maxLength={200}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex.: Impacto da IA generativa na produtividade de equipes de TI"
              required
            />
          </div>

          <div className="generate-options-grid">
            <div className="form-group">
              <label htmlFor="idea-notes" className="form-label-row">
                <span>Anotações / ângulo</span>
              </label>
              <textarea
                id="idea-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Focar em exemplos práticos para PMEs..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="idea-links" className="form-label-row">
                <span>Links de referência (um por linha, http/https)</span>
              </label>
              <textarea
                id="idea-links"
                rows={3}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder="https://exemplo.com/materia-1&#10;https://exemplo.com/estudo-2"
              />
            </div>
          </div>

          <div className="idea-form-actions">
            <button type="submit" className="primary" disabled={!isThemeValid}>
              + Salvar ideia
            </button>
          </div>
        </form>
      </div>

      {/* Barra de Filtros */}
      <div className="ideas-filter-bar">
        <div className="filter-search-box">
          <input
            type="text"
            placeholder="Filtrar ideias por texto ou anotação..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Filtrar ideias por texto"
          />
        </div>
        <div className="filter-status-box">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar ideias por status"
          >
            <option value="todas">Todos os status ({ideas.length})</option>
            <option value="nova">Somente novas ({counts.novas})</option>
            <option value="usada">Somente usadas ({counts.usadas})</option>
          </select>
        </div>
      </div>

      {/* Lista de Ideias */}
      {filteredIdeas.length === 0 ? (
        <div className="empty-review-container">
          <h3>Nenhuma ideia encontrada</h3>
          <p>
            {ideas.length === 0
              ? 'Adicione sua primeira ideia no formulário acima ou salve um tema diretamente na aba Gerar.'
              : 'Nenhuma ideia corresponde aos filtros selecionados.'}
          </p>
        </div>
      ) : (
        <div className="ideas-list">
          {filteredIdeas.map((idea) => {
            const isEditing = editingId === idea.id;

            if (isEditing) {
              return (
                <div key={idea.id} className="idea-card idea-card-editing">
                  <div className="form-group">
                    <label className="form-label-row">Tema da ideia *</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={editTheme}
                      onChange={(e) => setEditTheme(e.target.value)}
                    />
                  </div>
                  <div className="generate-options-grid">
                    <div className="form-group">
                      <label className="form-label-row">Anotações</label>
                      <textarea
                        rows={2}
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label-row">Links (um por linha)</label>
                      <textarea
                        rows={2}
                        value={editLinksText}
                        onChange={(e) => setEditLinksText(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="idea-edit-footer">
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="idea-status-select"
                    >
                      <option value="nova">Status: Nova</option>
                      <option value="usada">Status: Usada</option>
                    </select>
                    <div className="idea-card-actions">
                      <button type="button" className="btn-secondary" onClick={cancelEdit}>
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="primary"
                        onClick={() => saveEdit(idea.id)}
                        disabled={editTheme.trim().length < 3}
                      >
                        Salvar alterações
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={idea.id} className="idea-card">
                <div className="idea-card-top">
                  <div className="idea-title-group">
                    <span
                      className={`idea-status-badge ${
                        idea.status === 'usada' ? 'status-usada' : 'status-nova'
                      }`}
                    >
                      {idea.status === 'usada' ? 'usada' : 'nova'}
                    </span>
                    <h4 className="idea-theme-title">{idea.theme}</h4>
                  </div>
                  <span className="idea-date-text">{formatDatePtBr(idea.createdAt)}</span>
                </div>

                {idea.notes && <p className="idea-notes-text">{idea.notes}</p>}

                {Array.isArray(idea.links) && idea.links.length > 0 && (
                  <ul className="idea-links-list">
                    {idea.links.map((url, i) => (
                      <li key={i}>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="idea-card-actions">
                  <button
                    type="button"
                    className="primary btn-generate-from-idea"
                    onClick={() => onGenerateFromIdea(idea)}
                  >
                    Gerar a partir desta ideia
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => startEdit(idea)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger-outline"
                    onClick={() => handleDelete(idea)}
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
