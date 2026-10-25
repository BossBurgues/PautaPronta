import { useState } from 'react';
import { health } from '../api.js';

export default function AccessForm({ config, onUpdateAccess }) {
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const apiUrl = config?.apiUrl ?? 'http://localhost:8787';
  const token = config?.token ?? '';

  const handleApiUrlChange = (e) => {
    onUpdateAccess({ apiUrl: e.target.value, token });
    setTestResult(null);
  };

  const handleTokenChange = (e) => {
    onUpdateAccess({ apiUrl, token: e.target.value });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await health({ apiUrl, token });
      if (res.ok) {
        setTestResult({
          type: 'success',
          message: `Conexão bem-sucedida com a API! (${res.service || 'ok'})`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: res.message || 'Resposta inesperada do servidor.',
        });
      }
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err.message || 'Não foi possível conectar ao servidor.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="access-form-card">
      <div className="access-form-header">
        <h3>Acesso ao Worker (API)</h3>
        <p className="access-form-description">
          Configure o endereço do Cloudflare Worker e o token de acesso para gerar carrosséis diretamente.
        </p>
      </div>

      <div className="access-form-body">
        <div className="form-group">
          <label htmlFor="access-api-url" className="form-label-row">
            <span>URL da API</span>
            <span className="form-hint">Padrão local: http://localhost:8787</span>
          </label>
          <input
            id="access-api-url"
            type="url"
            value={apiUrl}
            onChange={handleApiUrlChange}
            placeholder="http://localhost:8787"
            className="input-text"
          />
        </div>

        <div className="form-group">
          <label htmlFor="access-token" className="form-label-row">
            <span>Token de acesso</span>
            <span className="form-hint">Definido em ACCESS_TOKEN no Worker</span>
          </label>
          <div className="token-input-wrapper">
            <input
              id="access-token"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={handleTokenChange}
              placeholder="Cole seu ACCESS_TOKEN"
              className="input-text"
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-toggle-token"
              onClick={() => setShowToken((prev) => !prev)}
              title={showToken ? 'Ocultar token' : 'Mostrar token'}
            >
              {showToken ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>

        <div className="access-form-actions">
          <button
            type="button"
            className="btn-test-connection"
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Testando conexão…' : 'Testar conexão'}
          </button>
        </div>

        {testResult && (
          <div
            className={`access-test-result ${
              testResult.type === 'success' ? 'result-success' : 'result-error'
            }`}
            role="status"
          >
            {testResult.type === 'success' ? '✓ ' : '✕ '}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  );
}
