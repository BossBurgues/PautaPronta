import { useState } from 'react';

const MAX_ACTIVE_FEEDS = 8;

function isValidFeedUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    new URL(trimmed);
    return true;
  } catch {
    return false;
  }
}

export default function FeedsForm({
  feeds = [],
  defaults = {},
  referenceSites = [],
  onUpdateFeeds,
  onUpdateReferenceSites,
  onUpdateDefaults,
}) {
  const [newSite, setNewSite] = useState('');
  const [siteMessage, setSiteMessage] = useState('');
  const handleAddSite = (e) => {
    e.preventDefault();
    const url = newSite.trim();
    if (!isValidFeedUrl(url)) {
      setSiteMessage('Informe um endereço completo, começando com https://');
      return;
    }
    if (referenceSites.includes(url)) {
      setSiteMessage('Este site já está na lista.');
      return;
    }
    if (referenceSites.length >= 8) {
      setSiteMessage('Máximo de 8 sites de referência.');
      return;
    }
    onUpdateReferenceSites?.([...referenceSites, url]);
    setNewSite('');
    setSiteMessage('');
  };
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [feedMessage, setFeedMessage] = useState('');

  const enabledCount = feeds.filter((f) => f.enabled).length;

  const handleToggleFeed = (index) => {
    setFeedMessage('');
    const target = feeds[index];
    if (!target) return;

    if (!target.enabled && enabledCount >= MAX_ACTIVE_FEEDS) {
      setFeedMessage(
        `Limite máximo de ${MAX_ACTIVE_FEEDS} feeds ativos atingido. Desative um feed antes de ativar o 9º.`,
      );
      return;
    }

    const next = feeds.map((f, i) => (i === index ? { ...f, enabled: !f.enabled } : f));
    onUpdateFeeds(next);
  };

  const handleRemoveFeed = (index) => {
    setFeedMessage('');
    const next = feeds.filter((_, i) => i !== index);
    onUpdateFeeds(next);
  };

  const handleAddFeed = (e) => {
    e.preventDefault();
    setFeedMessage('');

    const cleanName = newName.trim();
    const cleanUrl = newUrl.trim();

    if (!cleanName) {
      setFeedMessage('Informe o nome da fonte.');
      return;
    }

    if (!isValidFeedUrl(cleanUrl)) {
      setFeedMessage('Informe uma URL válida começando com http:// ou https://.');
      return;
    }

    if (feeds.some((f) => f.url.toLowerCase() === cleanUrl.toLowerCase())) {
      setFeedMessage('Este feed já está cadastrado.');
      return;
    }

    const canEnable = enabledCount < MAX_ACTIVE_FEEDS;
    const next = [
      ...feeds,
      {
        name: cleanName,
        url: cleanUrl,
        enabled: canEnable,
      },
    ];

    onUpdateFeeds(next);
    setNewName('');
    setNewUrl('');

    if (!canEnable) {
      setFeedMessage(
        `Feed adicionado como inativo pois já existem ${MAX_ACTIVE_FEEDS} feeds ativos.`,
      );
    }
  };

  const formats = Array.isArray(defaults.formats)
    ? defaults.formats
    : ['linkedin', 'instagram'];

  const handleDefaultFormatToggle = (fmt) => {
    if (formats.includes(fmt)) {
      if (formats.length > 1) {
        onUpdateDefaults({ formats: formats.filter((f) => f !== fmt) });
      }
    } else {
      onUpdateDefaults({ formats: [...formats, fmt] });
    }
  };

  return (
    <div className="feeds-defaults-wrapper">
      {/* Bloco Fontes RSS */}
      <div className="feeds-form-card">
        <div className="feeds-form-header">
          <div>
            <h3>Fontes RSS</h3>
            <p className="feeds-form-description">
              Use feeds de fontes oficiais e confiáveis. ({enabledCount} / {MAX_ACTIVE_FEEDS} ativos)
            </p>
          </div>
        </div>

        {feedMessage && (
          <div className="callout callout-warning" role="alert">
            <p>{feedMessage}</p>
          </div>
        )}

        {/* Lista de Feeds */}
        {feeds.length === 0 ? (
          <p className="empty-hint">Nenhum feed RSS cadastrado.</p>
        ) : (
          <div className="feeds-list">
            {feeds.map((feed, idx) => (
              <div key={`${feed.url}-${idx}`} className="feed-item-row">
                <label className="checkbox-label feed-toggle-label">
                  <input
                    type="checkbox"
                    checked={Boolean(feed.enabled)}
                    onChange={() => handleToggleFeed(idx)}
                  />
                  <span className="feed-item-info">
                    <strong className="feed-item-name">{feed.name}</strong>
                    <span className="feed-item-url">{feed.url}</span>
                  </span>
                </label>
                <button
                  type="button"
                  className="btn-danger-outline"
                  onClick={() => handleRemoveFeed(idx)}
                  title="Remover feed"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulário para Adicionar Feed */}
        <form onSubmit={handleAddFeed} className="feed-add-form">
          <h4>Adicionar novo feed RSS</h4>
          <div className="feed-add-inputs">
            <input
              type="text"
              placeholder="Nome da fonte (ex.: Portal Gov.br)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="url"
              placeholder="https://exemplo.com/rss.xml"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <button type="submit" className="primary">
              + Adicionar feed
            </button>
          </div>
        </form>
      </div>

      {/* Sites de referência (sem RSS) */}
      <div className="feeds-form-card">
        <div className="feeds-form-header">
          <h3>Sites de referência</h3>
          <p className="feeds-form-description">
            Sites confiáveis que não têm RSS. Com a busca na web ligada, a pesquisa começa por eles.
            ({referenceSites.length} / 8)
          </p>
        </div>
        <ul className="sites-list">
          {referenceSites.map((site) => (
            <li key={site} className="feed-item">
              <span className="feed-url">{site}</span>
              <button
                type="button"
                className="btn-danger-outline"
                onClick={() => onUpdateReferenceSites?.(referenceSites.filter((s) => s !== site))}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
        <form className="add-site-row" onSubmit={handleAddSite}>
          <input
            type="url"
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            placeholder="https://exemplo.org/"
            aria-label="Endereço do site de referência"
          />
          <button type="submit" className="primary">
            + Adicionar site
          </button>
        </form>
        {siteMessage && <p className="field-hint-error">{siteMessage}</p>}
      </div>

      {/* Bloco Padrões de Geração */}
      <div className="defaults-form-card">
        <div className="feeds-form-header">
          <h3>Padrões de geração</h3>
          <p className="feeds-form-description">
            Valores iniciais que preenchem automaticamente a tela Gerar.
          </p>
        </div>

        <div className="generate-options-grid">
          <div className="form-group">
            <label htmlFor="default-slide-count" className="form-label-row">
              <span>Nº de slides padrão</span>
            </label>
            <select
              id="default-slide-count"
              value={defaults.slideCount || 5}
              onChange={(e) => onUpdateDefaults({ slideCount: Number(e.target.value) })}
            >
              <option value={4}>4 slides</option>
              <option value={5}>5 slides</option>
              <option value={6}>6 slides</option>
              <option value={7}>7 slides</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="default-tone" className="form-label-row">
              <span>Tom de voz padrão</span>
            </label>
            <select
              id="default-tone"
              value={defaults.tone || 'profissional-acessivel'}
              onChange={(e) => onUpdateDefaults({ tone: e.target.value })}
            >
              <option value="profissional-acessivel">Profissional, acessível e direto</option>
              <option value="profissional-didatico">Profissional e didático</option>
              <option value="direto-pratico">Direto e prático</option>
              <option value="analitico">Analítico, com dados</option>
            </select>
          </div>
        </div>

        <div className="generate-options-grid" style={{ marginTop: '12px' }}>
          <div className="form-group">
            <span className="form-label-row">Formatos padrão</span>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formats.includes('linkedin')}
                  onChange={() => handleDefaultFormatToggle('linkedin')}
                />
                <span>LinkedIn</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formats.includes('instagram')}
                  onChange={() => handleDefaultFormatToggle('instagram')}
                />
                <span>Instagram</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <span className="form-label-row">Busca na web padrão</span>
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(defaults.useWebSearch)}
                  onChange={(e) => onUpdateDefaults({ useWebSearch: e.target.checked })}
                />
                <span>Ativar busca na web por padrão</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
