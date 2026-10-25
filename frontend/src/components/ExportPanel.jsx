import { useState, useRef, useEffect } from 'react';
import {
  exportPdf,
  exportPngZip,
  exportWhatsappMosaic,
  buildCaption,
  copyText,
} from '../canvas/exporters.js';

export default function ExportPanel({ content, profile, logoImg, validation }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const showFeedback = (msg, isError = false) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ msg, isError });
    timerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 3000);
  };

  const handleExportPdf = async () => {
    try {
      setLoadingAction('pdf');
      await exportPdf(content, profile, logoImg);
      showFeedback('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar PDF.', true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExportZip = async () => {
    try {
      setLoadingAction('zip');
      await exportPngZip(content, profile, logoImg);
      showFeedback('ZIP de imagens gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar ZIP de imagens.', true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExportWhatsapp = async () => {
    try {
      setLoadingAction('whatsapp');
      await exportWhatsappMosaic(content, profile, logoImg);
      showFeedback('Mosaico do WhatsApp gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao gerar mosaico WhatsApp.', true);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCopyCaption = async (network) => {
    try {
      setLoadingAction(`caption-${network}`);
      const caption = buildCaption(content, network);
      const success = await copyText(caption);
      if (success) {
        showFeedback(
          `Legenda do ${network === 'linkedin' ? 'LinkedIn' : 'Instagram'} copiada!`,
        );
      } else {
        showFeedback('Não foi possível copiar a legenda.', true);
      }
    } catch (err) {
      console.error(err);
      showFeedback('Erro ao copiar legenda.', true);
    } finally {
      setLoadingAction(null);
    }
  };

  const hasErrors = validation?.errors?.length > 0;

  return (
    <div className="export-panel-card">
      <div className="export-panel-header">
        <h3 className="section-title">Exportar e Publicar</h3>
      </div>

      {hasErrors && (
        <div className="export-warning-badge">
          ⚠️ Há problemas no conteúdo; revise antes de publicar.
        </div>
      )}

      {feedback && (
        <div
          className={`export-feedback-toast ${feedback.isError ? 'toast-error' : 'toast-success'}`}
          role="status"
        >
          {feedback.msg}
        </div>
      )}

      <div className="export-actions-grid">
        <button
          type="button"
          className="btn-export"
          onClick={handleExportPdf}
          disabled={loadingAction !== null}
        >
          📄 {loadingAction === 'pdf' ? 'Gerando…' : 'PDF (LinkedIn)'}
        </button>

        <button
          type="button"
          className="btn-export"
          onClick={handleExportZip}
          disabled={loadingAction !== null}
        >
          📦 {loadingAction === 'zip' ? 'Gerando…' : 'ZIP de imagens (Instagram)'}
        </button>

        <button
          type="button"
          className="btn-export"
          onClick={handleExportWhatsapp}
          disabled={loadingAction !== null}
        >
          📱 {loadingAction === 'whatsapp' ? 'Gerando…' : 'Imagem para WhatsApp'}
        </button>

        <button
          type="button"
          className="btn-export-secondary"
          onClick={() => handleCopyCaption('linkedin')}
          disabled={loadingAction !== null}
        >
          📋 {loadingAction === 'caption-linkedin' ? 'Copiando…' : 'Copiar legenda LinkedIn'}
        </button>

        <button
          type="button"
          className="btn-export-secondary"
          onClick={() => handleCopyCaption('instagram')}
          disabled={loadingAction !== null}
        >
          📋 {loadingAction === 'caption-instagram' ? 'Copiando…' : 'Copiar legenda Instagram'}
        </button>
      </div>

      <p className="export-reminder">
        Revise o conteúdo e as fontes antes de publicar. A publicação é manual.
      </p>
    </div>
  );
}
