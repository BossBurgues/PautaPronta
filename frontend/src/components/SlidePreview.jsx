import { useEffect, useRef, useState } from 'react';
import { renderSlide, ensureFonts } from '../canvas/renderSlide.js';
import { exportSingleSlide } from '../canvas/exporters.js';

export default function SlidePreview({ content, index, profile, logoImg }) {
  const canvasRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;

    const draw = async () => {
      const fontFamily = profile?.fontFamily || 'Inter';
      await ensureFonts(fontFamily);

      if (isCancelled) return;

      const slide = content?.slides?.[index];
      if (!slide) return;

      const total = content?.slides?.length || 1;
      renderSlide(ctx, {
        slide,
        index,
        total,
        content,
        profile,
        logoImg,
      });
    };

    draw();

    return () => {
      isCancelled = true;
    };
  }, [content, index, profile, logoImg]);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await exportSingleSlide(content, index, profile, logoImg);
    } catch (err) {
      console.error('Erro ao baixar PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="slide-preview-wrapper">
      <canvas
        ref={canvasRef}
        width={1080}
        height={1350}
        className="slide-canvas"
        aria-label={`Slide ${index + 1}`}
      />
      <div className="slide-preview-footer">
        <span className="slide-preview-caption">Slide {index + 1}</span>
        <button
          type="button"
          className="btn-download-slide"
          onClick={handleDownload}
          disabled={downloading}
          title="Baixar este slide em PNG (1080×1350)"
        >
          {downloading ? '…' : 'Baixar PNG'}
        </button>
      </div>
    </div>
  );
}
