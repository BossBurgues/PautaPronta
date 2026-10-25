import { useState, useCallback, useRef } from 'react';
import { load, save } from './storage.js';
import { DEFAULT_PROFILE } from './defaults.js';

const CONFIG_KEY = 'config';

export const DEFAULT_CONFIG = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  token: '',
  profile: DEFAULT_PROFILE,
  feeds: [
    {
      name: 'MIT Technology Review',
      url: 'https://www.technologyreview.com/feed/',
      enabled: true,
    },
    {
      name: 'Agência Brasil',
      url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
      enabled: true,
    },
  ],
  defaults: {
    slideCount: 5,
    formats: ['linkedin', 'instagram'],
    useWebSearch: false,
    tone: 'profissional-didatico',
  },
};

function mergeConfig(saved) {
  if (!saved || typeof saved !== 'object') {
    return DEFAULT_CONFIG;
  }
  const savedProfile = saved.profile && typeof saved.profile === 'object' ? saved.profile : {};
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    profile: {
      ...DEFAULT_PROFILE,
      ...savedProfile,
      colors: {
        ...DEFAULT_PROFILE.colors,
        ...(savedProfile.colors || {}),
      },
    },
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...(saved.defaults || {}),
    },
    feeds: Array.isArray(saved.feeds) ? saved.feeds : DEFAULT_CONFIG.feeds,
  };
}

/**
 * Hook para gerenciar as configurações da aplicação com persistência no localStorage.
 */
export function useConfig() {
  const [config, setConfigState] = useState(() => {
    const saved = load(CONFIG_KEY, null);
    return mergeConfig(saved);
  });

  const configRef = useRef(config);
  configRef.current = config;

  const updateConfig = useCallback((patch) => {
    const next = mergeConfig({ ...configRef.current, ...patch });
    const ok = save(CONFIG_KEY, next);
    if (ok) {
      configRef.current = next;
      setConfigState(next);
    }
    return ok;
  }, []);

  const updateAccess = useCallback(({ apiUrl, token }) => {
    const prev = configRef.current;
    const next = {
      ...prev,
      apiUrl: apiUrl !== undefined ? apiUrl.trim() : prev.apiUrl,
      token: token !== undefined ? token.trim() : prev.token,
    };
    const ok = save(CONFIG_KEY, next);
    if (ok) {
      configRef.current = next;
      setConfigState(next);
    }
    return ok;
  }, []);

  const updateProfile = useCallback((profilePatch) => {
    const prev = configRef.current;
    const nextProfile = {
      ...prev.profile,
      ...profilePatch,
      colors: {
        ...prev.profile.colors,
        ...(profilePatch.colors || {}),
      },
    };
    const next = { ...prev, profile: nextProfile };
    const ok = save(CONFIG_KEY, next);
    if (ok) {
      configRef.current = next;
      setConfigState(next);
    }
    return ok;
  }, []);

  const resetProfile = useCallback(() => {
    const prev = configRef.current;
    const next = {
      ...prev,
      profile: {
        ...DEFAULT_PROFILE,
        colors: { ...DEFAULT_PROFILE.colors },
      },
    };
    const ok = save(CONFIG_KEY, next);
    if (ok) {
      configRef.current = next;
      setConfigState(next);
    }
    return ok;
  }, []);

  const updateFeeds = useCallback((feeds) => {
    const prev = configRef.current;
    const next = { ...prev, feeds: Array.isArray(feeds) ? feeds : [] };
    const ok = save(CONFIG_KEY, next);
    if (ok) {
      configRef.current = next;
      setConfigState(next);
    }
    return ok;
  }, []);

  const updateDefaults = useCallback((defaultsPatch) => {
    const prev = configRef.current;
    const next = {
      ...prev,
      defaults: {
        ...prev.defaults,
        ...defaultsPatch,
      },
    };
    const ok = save(CONFIG_KEY, next);
    if (ok) {
      configRef.current = next;
      setConfigState(next);
    }
    return ok;
  }, []);

  return {
    config,
    updateConfig,
    updateAccess,
    updateProfile,
    resetProfile,
    updateFeeds,
    updateDefaults,
  };
}
