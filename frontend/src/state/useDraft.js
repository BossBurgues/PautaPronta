import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeContent } from '../../../shared/schema.js';
import { load, save } from './storage.js';
import { patchSlide, setField, insertSlide, deleteSlide } from './draftOps.js';

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
    setContentState((prev) => patchSlide(prev, index, patch));
  }, []);

  const updateField = useCallback((name, value) => {
    setContentState((prev) => setField(prev, name, value));
  }, []);

  const addSlide = useCallback(() => {
    setContentState((prev) => insertSlide(prev));
  }, []);

  const removeSlide = useCallback((index) => {
    setContentState((prev) => deleteSlide(prev, index));
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
