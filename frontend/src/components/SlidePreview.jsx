import { useEffect, useRef, useState } from 'react';
import { renderSlide, ensureFonts } from '../canvas/renderSlide.js';
import { exportSingleSlide } from '../canvas/exporters.js';

export default function SlidePreview({ item, position, total, content, profile, assets, logoImg, onOverflow, downloadable = true }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [overflow, setOverflow] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !item) return undefined;
    let cancelled = false;

    (async () => {
      await ensureFonts(profile);
      if (cancelled) return;
      const result = renderSlide(ctx, { item, position, total, content, profile, assets, preview: true });
      setOverflow(result.overflow);
      onOverflow?.(position - 1, result.overflow);
    })();

    return () => {
      cancelled = true;
    };
  }, [item, position, total, content, profile, assets, onOverflow]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await exportSingleSlide(content, position - 1, profile, logoImg);
    } catch (err) {
      console.error('Erro ao baixar PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  const label = item?.kind === 'fontes' ? 'Fontes' : `Slide ${position}`;

  return (
    <div className={`slide-preview-wrapper ${overflow ? 'has-overflow' : ''}`}>
      <canvas
        ref={canvasRef}
        width={1080}
        height={1350}
        className="slide-canvas"
        role="img"
        aria-label={`${label}: ${item?.slide?.title || 'referências'}`}
      />
      <div className="slide-preview-footer">
        <span className="slide-preview-caption">
          {label}
          {overflow && <span className="overflow-badge"> · texto não coube</span>}
        </span>
        {downloadable && (
          <button
            type="button"
            className="btn-download-slide"
            onClick={handleDownload}
            disabled={downloading}
            title="Baixar este slide em PNG (1080×1350)"
          >
            {downloading ? '…' : 'Baixar PNG'}
          </button>
        )}
      </div>
    </div>
  );
}
