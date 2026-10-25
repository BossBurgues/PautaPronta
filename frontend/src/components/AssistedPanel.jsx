import { useState, useMemo } from 'react';
import { buildAssistedPrompt, buildFixPrompt } from '../../../shared/prompt.js';
import { extractJson } from '../../../shared/json.js';
import { normalizeContent, validateContent } from '../../../shared/schema.js';

export default function AssistedPanel({
  theme = '',
  slideCount = 5,
  tone = 'profissional-didatico',
  feedUrls = [],
  onSuccess,
  onBack,
}) {
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedFix, setCopiedFix] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);

  // Gera o prompt assistido automaticamente a partir das configurações atuais
  const assistedPrompt = useMemo(() => {
    return buildAssistedPrompt({
      theme: theme || 'Tema do carrossel',
      slideCount,
      tone,
      feedUrls,
    });
  }, [theme, slideCount, tone, feedUrls]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(assistedPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      // Fallback simples
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    }
  };

  const handleCopyFix = async () => {
    if (validationErrors.length === 0) return;
    const fixText = buildFixPrompt(validationErrors);
    try {
      await navigator.clipboard.writeText(fixText);
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2500);
    } catch {
      setCopiedFix(true);
      setTimeout(() => setCopiedFix(false), 2500);
    }
  };

  const handleApplyResponse = () => {
    setValidationErrors([]);
    if (!pastedText.trim()) {
      setValidationErrors(['Cole a resposta da IA no campo de texto antes de continuar.']);
      return;
    }

    try {
      const rawObj = extractJson(pastedText);
      const normalized = normalizeContent(rawObj);

      // No modo assistido, todas as fontes iniciam com verified: false para checagem manual
      const finalContent = {
        ...normalized,
        sources: (normalized.sources || []).map((s) => ({
          ...s,
          verified: false,
        })),
      };

      const validation = validateContent(finalContent);
      if (!validation.valid) {
        setValidationErrors(validation.errors);
        return;
      }

      // Válido: repassa para o handler de sucesso
      onSuccess?.(finalContent);
    } catch (err) {
      setValidationErrors([err.message || 'Erro ao processar o JSON da resposta.']);
    }
  };

  return (
    <div className="assisted-panel-card">
      <div className="assisted-panel-header">
        <div className="assisted-title-row">
          <h3>Modo Assistido (100% no navegador e gratuito)</h3>
          {onBack && (
            <button type="button" className="btn-secondary" onClick={onBack}>
              ← Voltar ao Gerador Direto
            </button>
          )}
        </div>
        <p className="assisted-description">
          Use este modo quando a cota gratuita da API esgotar ou se preferir usar interfaces gratuitas como
          Google Gemini, ChatGPT ou Claude sem gastar requisições.
        </p>
      </div>

      <div className="assisted-steps">
        {/* Passo 1 */}
        <div className="assisted-step-card">
          <div className="assisted-step-header">
            <span className="step-number">Passo 1</span>
            <h4>Copie o prompt estruturado</h4>
          </div>
          <p className="step-hint">
            Cole em <strong>gemini.google.com</strong>, <strong>chatgpt.com</strong> ou outro assistente gratuito.
          </p>
          <textarea
            readOnly
            value={assistedPrompt}
            rows={10}
            className="assisted-prompt-textarea"
            aria-label="Prompt estruturado para copiar"
          />
          <div className="step-actions">
            <button
              type="button"
              className="primary btn-copy-prompt"
              onClick={handleCopyPrompt}
            >
              {copiedPrompt ? '✓ Prompt copiado!' : 'Copiar prompt'}
            </button>
          </div>
        </div>

        {/* Passo 2 */}
        <div className="assisted-step-card">
          <div className="assisted-step-header">
            <span className="step-number">Passo 2</span>
            <h4>Cole a resposta da IA</h4>
          </div>
          <p className="step-hint">
            Copie a resposta completa que o assistente gerou e cole aqui embaixo:
          </p>
          <textarea
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              if (validationErrors.length > 0) setValidationErrors([]);
            }}
            placeholder="Cole aqui o texto ou bloco ```json gerado pelo assistente..."
            rows={10}
            className="assisted-response-textarea"
            aria-label="Cole aqui a resposta da IA"
          />
          <div className="step-actions">
            <button
              type="button"
              className="primary btn-apply-response"
              onClick={handleApplyResponse}
              disabled={!pastedText.trim()}
            >
              Usar resposta e abrir Revisão
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Erros e Pedido de Correção */}
      {validationErrors.length > 0 && (
        <div className="assisted-errors-card" role="alert">
          <div className="assisted-errors-header">
            <strong>A resposta da IA precisa de correções:</strong>
            <button
              type="button"
              className="btn-copy-fix"
              onClick={handleCopyFix}
            >
              {copiedFix ? '✓ Pedido de correção copiado!' : 'Copiar pedido de correção'}
            </button>
          </div>
          <ul className="assisted-errors-list">
            {validationErrors.map((err, i) => (
              <li key={`fix-err-${i}`}>{err}</li>
            ))}
          </ul>
          <p className="fix-instructions-hint">
            Clique no botão acima para copiar uma mensagem pronta de correção e cole-a no chat do assistente. Em seguida, cole a nova resposta aqui.
          </p>
        </div>
      )}
    </div>
  );
}
