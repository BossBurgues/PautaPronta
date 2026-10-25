import { useState, useCallback } from 'react';
import { load, save } from './storage.js';

const HISTORY_KEY = 'history';
export const MAX_HISTORY = 20;

/**
 * Função pura que insere um novo registro no início do histórico,
 * mantendo no máximo `max` itens (padrão 20).
 *
 * @param {Array} list
 * @param {object} entry
 * @param {number} max
 * @returns {Array}
 */
export function pushHistory(list, entry, max = MAX_HISTORY) {
  const safeList = Array.isArray(list) ? list : [];
  return [entry, ...safeList].slice(0, max);
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Hook para gerenciar o histórico de carrosséis gerados (pp:history).
 */
export function useHistory() {
  const [history, setHistory] = useState(() => {
    const saved = load(HISTORY_KEY, []);
    return Array.isArray(saved) ? saved.slice(0, MAX_HISTORY) : [];
  });

  const addHistory = useCallback(({ theme, mode = 'online', content }) => {
    if (!content) return null;
    const entry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      theme: (theme || content.topic || 'Carrossel sem tema').trim(),
      mode: mode === 'assistido' ? 'assistido' : 'online',
      content,
    };

    setHistory((prev) => {
      const next = pushHistory(prev, entry, MAX_HISTORY);
      save(HISTORY_KEY, next);
      return next;
    });

    return entry;
  }, []);

  const removeHistory = useCallback((id) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item.id !== id);
      save(HISTORY_KEY, next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    save(HISTORY_KEY, []);
  }, []);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
  };
}
