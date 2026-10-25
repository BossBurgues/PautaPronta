import { useState, useEffect, useCallback, useRef } from 'react';
import { LIMITS, normalizeContent } from '../../../shared/schema.js';
import { load, save } from './storage.js';

const DRAFT_KEY = 'draft';

/**
 * Hook para gerenciar e persistir o rascunho de carrossel no localStorage.
 */
export function useDraft() {
  const [content, setContentState] = useState(() => {
    const saved = load(DRAFT_KEY, null);
    return saved ? normalizeContent(saved) : null;
  });

  const saveTimerRef = useRef(null);

  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      if (content) {
        save(DRAFT_KEY, content);
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [content]);

  const setContent = useCallback((newContent) => {
    if (!newContent) {
      setContentState(null);
      save(DRAFT_KEY, null);
      return;
    }
    const normalized = normalizeContent(newContent);
    setContentState(normalized);
  }, []);

  const updateSlide = useCallback((index, patch) => {
    setContentState((prev) => {
      if (!prev || !Array.isArray(prev.slides)) return prev;
      const newSlides = prev.slides.map((slide, i) =>
        i === index ? { ...slide, ...patch } : slide,
      );
      return normalizeContent({ ...prev, slides: newSlides });
    });
  }, []);

  const updateField = useCallback((name, value) => {
    setContentState((prev) => {
      if (!prev) return prev;
      return normalizeContent({ ...prev, [name]: value });
    });
  }, []);

  const addSlide = useCallback(() => {
    setContentState((prev) => {
      if (!prev || !Array.isArray(prev.slides)) return prev;
      if (prev.slides.length >= LIMITS.slidesMax) return prev;

      const newSlides = [...prev.slides];
      // Insere um slide ponto antes da conclusão
      const insertIndex = Math.max(0, newSlides.length - 1);
      newSlides.splice(insertIndex, 0, {
        role: 'ponto',
        title: '',
        body: '',
      });

      return normalizeContent({ ...prev, slides: newSlides });
    });
  }, []);

  const removeSlide = useCallback((index) => {
    setContentState((prev) => {
      if (!prev || !Array.isArray(prev.slides)) return prev;
      if (prev.slides.length <= LIMITS.slidesMin) return prev;

      const newSlides = prev.slides.filter((_, i) => i !== index);
      return normalizeContent({ ...prev, slides: newSlides });
    });
  }, []);

  return {
    content,
    setContent,
    updateSlide,
    updateField,
    addSlide,
    removeSlide,
  };
}
