import { useState, useCallback, useRef } from 'react';
import { load, save } from './storage.js';
import { DEFAULT_PROFILE, migrateProfile } from './defaults.js';
import { DEFAULT_TONE, DEFAULT_AUDIENCE, DEFAULT_VISUAL_FORMAT } from '../../../shared/prompt.js';

const CONFIG_KEY = 'config';

export const DEFAULT_CONFIG = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  token: '',
  profile: DEFAULT_PROFILE,
  // Feeds RSS indicados na avaliação (os sites sem RSS ficam em referenceSites).
  feeds: [
    { name: 'HOTMILK', url: 'https://hotmilk.com.br/feed/', enabled: true },
    { name: 'NIST — notícias', url: 'https://www.nist.gov/news-events/news/rss.xml', enabled: true },
    { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', enabled: true },
  ],
  // Sites de referência sem RSS: a IA prioriza pesquisar neles quando a busca na web está ligada.
  referenceSites: [
    'https://hotmilk.com.br/pdi/',
    'https://hai.stanford.edu/',
    'https://oecd.ai/en/',
    'https://www.nist.gov/itl/ai-risk-management-framework',
    'https://www.finep.gov.br/',
  ],
  defaults: {
    slideCount: 5,
    formats: ['linkedin', 'instagram'],
    useWebSearch: true,
    tone: DEFAULT_TONE,
    audience: DEFAULT_AUDIENCE,
    visualFormat: DEFAULT_VISUAL_FORMAT,
  },
};

function mergeConfig(saved) {
  if (!saved || typeof saved !== 'object') {
    return DEFAULT_CONFIG;
  }
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    profile: migrateProfile(saved.profile),
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...(saved.defaults || {}),
    },
    feeds: Array.isArray(saved.feeds) ? saved.feeds : DEFAULT_CONFIG.feeds,
    referenceSites: Array.isArray(saved.referenceSites) ? saved.referenceSites : DEFAULT_CONFIG.referenceSites,
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
      // Restaurar padrão mantém logo e @, que são do usuário.
      profile: {
        ...DEFAULT_PROFILE,
        colors: { ...DEFAULT_PROFILE.colors },
        logoDataUrl: prev.profile.logoDataUrl,
        handleLinkedin: prev.profile.handleLinkedin,
        handleInstagram: prev.profile.handleInstagram,
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

  const updateReferenceSites = useCallback((sites) => {
    const prev = configRef.current;
    const next = { ...prev, referenceSites: Array.isArray(sites) ? sites : [] };
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
    updateReferenceSites,
    updateDefaults,
  };
}
