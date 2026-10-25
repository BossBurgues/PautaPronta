import { useState, useEffect } from 'react';
import { LIMITS } from '../../../shared/schema.js';

export default function CaptionEditor({
  captionLinkedin = '',
  captionInstagram = '',
  cta = '',
  hashtags = [],
  onUpdateField,
}) {
  const [hashtagsText, setHashtagsText] = useState(() =>
    Array.isArray(hashtags) ? hashtags.join(' ') : '',
  );

  useEffect(() => {
    setHashtagsText(Array.isArray(hashtags) ? hashtags.join(' ') : '');
  }, [hashtags]);

  const linkedinLen = captionLinkedin.length;
  const instagramLen = captionInstagram.length;
  const ctaLen = cta.length;

  const isLinkedinOver = linkedinLen > LIMITS.captionLinkedinMax;
  const isInstagramOver = instagramLen > LIMITS.captionInstagramMax;
  const isCtaOver = ctaLen > LIMITS.ctaMax;

  const handleHashtagsBlur = () => {
    onUpdateField('hashtags', hashtagsText);
  };

  return (
    <div className="caption-editor-card">
      <h3 className="section-title">Legendas e Publicação</h3>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="caption-linkedin">Legenda LinkedIn</label>
          <span className={`char-counter ${isLinkedinOver ? 'over-limit' : ''}`}>
            {linkedinLen}/{LIMITS.captionLinkedinMax}
          </span>
        </div>
        <textarea
          id="caption-linkedin"
          value={captionLinkedin}
          onChange={(e) => onUpdateField('caption_linkedin', e.target.value)}
          placeholder="Legenda analítica e contextualizada para o LinkedIn"
          rows={4}
        />
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="caption-instagram">Legenda Instagram</label>
          <span className={`char-counter ${isInstagramOver ? 'over-limit' : ''}`}>
            {instagramLen}/{LIMITS.captionInstagramMax}
          </span>
        </div>
        <textarea
          id="caption-instagram"
          value={captionInstagram}
          onChange={(e) => onUpdateField('caption_instagram', e.target.value)}
          placeholder="Legenda direta e visual para o Instagram"
          rows={3}
        />
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="input-cta">Chamada para Ação (CTA)</label>
          <span className={`char-counter ${isCtaOver ? 'over-limit' : ''}`}>
            {ctaLen}/{LIMITS.ctaMax}
          </span>
        </div>
        <input
          id="input-cta"
          type="text"
          value={cta}
          onChange={(e) => onUpdateField('cta', e.target.value)}
          placeholder="Ex.: Como sua empresa lida com esse desafio hoje?"
        />
      </div>

      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="input-hashtags">Hashtags (3 a 5, separadas por espaço)</label>
          <span className="char-counter">
            {hashtags.length}/{LIMITS.hashtagsMax}
          </span>
        </div>
        <input
          id="input-hashtags"
          type="text"
          value={hashtagsText}
          onChange={(e) => setHashtagsText(e.target.value)}
          onBlur={handleHashtagsBlur}
          placeholder="#Inovacao #IA #Compliance #Tecnologia"
        />
      </div>
    </div>
  );
}
