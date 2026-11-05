import { useRef, useState } from 'react';
import { buildBackup, backupFilename, parseBackup } from '../state/backup.js';
import { save } from '../state/storage.js';
import { downloadBlob } from '../canvas/exporters.js';

export default function DataBackup({ config, ideas, history }) {
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const handleExport = () => {
    const backup = buildBackup({ config, ideas, history });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    downloadBlob(blob, backupFilename());
    setMessage({ type: 'success', text: 'Backup baixado. Guarde o arquivo num lugar seguro.' });
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const parsed = parseBackup(await file.text());
      const ok = window.confirm(
        `Restaurar ${parsed.ideas.length} ideia(s) e ${parsed.history.length} item(ns) do histórico?\n` +
          'Isso substitui as ideias, o histórico e a configuração atuais (o token de acesso é mantido).',
      );
      if (!ok) return;

      const saved =
        save('config', { ...parsed.config, token: config?.token || '' }) &&
        save('ideas', parsed.ideas) &&
        save('history', parsed.history);
      if (!saved) {
        setMessage({ type: 'error', text: 'Não houve espaço no navegador para restaurar o backup.' });
        return;
      }
      window.location.reload();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Não foi possível ler o backup.' });
    }
  };

  return (
    <div className="access-form-card">
      <div className="access-form-header">
        <h3>Backup dos dados</h3>
        <p className="access-form-description">
          Ideias, histórico e configurações ficam só neste navegador. Baixe um backup de vez em quando: limpar o
          navegador ou trocar de computador apaga esses dados. O token de acesso não vai no arquivo.
        </p>
      </div>
      <div className="access-form-body">
        <div className="review-top-actions">
          <button type="button" className="btn-secondary" onClick={handleExport}>
            Baixar backup
          </button>
          <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Restaurar backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImport}
            hidden
          />
        </div>
        {message && (
          <p className={`access-test-result ${message.type === 'error' ? 'result-error' : 'result-success'}`} role="status">
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
