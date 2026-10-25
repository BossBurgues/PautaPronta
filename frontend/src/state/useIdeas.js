import { useState, useCallback } from 'react';
import { load, save } from './storage.js';

const IDEAS_KEY = 'ideas';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Filtra e normaliza uma lista ou texto de links para conter apenas URLs http(s):// válidas.
 */
export function normalizeLinks(rawLinks) {
  const lines = Array.isArray(rawLinks)
    ? rawLinks
    : typeof rawLinks === 'string'
      ? rawLinks.split(/\r?\n/)
      : [];

  const result = [];
  const seen = new Set();

  for (const line of lines) {
    if (typeof line !== 'string') continue;
    const url = line.trim();
    if (!url) continue;
    if (/^https?:\/\//i.test(url)) {
      try {
        new URL(url);
        if (!seen.has(url)) {
          seen.add(url);
          result.push(url);
        }
      } catch {
        // Ignora URL malformada
      }
    }
  }

  return result;
}

/**
 * Hook para gerenciar o banco de ideias no localStorage (pp:ideas).
 */
export function useIdeas() {
  const [ideas, setIdeas] = useState(() => {
    const saved = load(IDEAS_KEY, []);
    return Array.isArray(saved) ? saved : [];
  });

  const addIdea = useCallback(({ theme, notes = '', links = [] }) => {
    const cleanTheme = typeof theme === 'string' ? theme.trim() : '';
    if (cleanTheme.length < 3) return null;

    const newIdea = {
      id: generateId(),
      theme: cleanTheme.slice(0, 200),
      notes: typeof notes === 'string' ? notes.trim() : '',
      links: normalizeLinks(links),
      status: 'nova',
      createdAt: new Date().toISOString(),
    };

    setIdeas((prev) => {
      const next = [newIdea, ...prev];
      save(IDEAS_KEY, next);
      return next;
    });

    return newIdea;
  }, []);

  const updateIdea = useCallback((id, patch) => {
    setIdeas((prev) => {
      const next = prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...patch };
        if (patch.theme !== undefined) {
          updated.theme = String(patch.theme).trim().slice(0, 200);
        }
        if (patch.notes !== undefined) {
          updated.notes = String(patch.notes).trim();
        }
        if (patch.links !== undefined) {
          updated.links = normalizeLinks(patch.links);
        }
        return updated;
      });
      save(IDEAS_KEY, next);
      return next;
    });
  }, []);

  const removeIdea = useCallback((id) => {
    setIdeas((prev) => {
      const next = prev.filter((item) => item.id !== id);
      save(IDEAS_KEY, next);
      return next;
    });
  }, []);

  const markIdeaUsed = useCallback((id) => {
    if (!id) return;
    setIdeas((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, status: 'usada' } : item,
      );
      save(IDEAS_KEY, next);
      return next;
    });
  }, []);

  return {
    ideas,
    addIdea,
    updateIdea,
    removeIdea,
    markIdeaUsed,
  };
}
