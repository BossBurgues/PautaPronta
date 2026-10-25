import { useState, useEffect } from 'react';
import { useDraft } from './state/useDraft.js';
import { useConfig } from './state/useConfig.js';
import { useIdeas } from './state/useIdeas.js';
import { useHistory } from './state/useHistory.js';
import { loadImage } from './canvas/renderSlide.js';
import Review from './components/Review.jsx';
import GenerateForm from './components/GenerateForm.jsx';
import ProfileForm from './components/ProfileForm.jsx';
import FeedsForm from './components/FeedsForm.jsx';
import AccessForm from './components/AccessForm.jsx';
import IdeaBank from './components/IdeaBank.jsx';
import HistoryList from './components/HistoryList.jsx';
import DataBackup from './components/DataBackup.jsx';

const TABS = [
  { id: 'gerar', label: 'Gerar' },
  { id: 'revisao', label: 'Revisão' },
  { id: 'ideias', label: 'Ideias' },
  { id: 'historico', label: 'Histórico' },
  { id: 'config', label: 'Config' },
];

export default function App() {
  const {
    config,
    updateAccess,
    updateProfile,
    resetProfile,
    updateFeeds,
    updateDefaults,
  } = useConfig();

  const { ideas, addIdea, updateIdea, removeIdea, markIdeaUsed } = useIdeas();
  const { history, addHistory, removeHistory, clearHistory } = useHistory();

  const [activeTab, setActiveTab] = useState('gerar');
  const [usedSources, setUsedSources] = useState([]);
  const [feedErrors, setFeedErrors] = useState([]);
  const [initialTheme, setInitialTheme] = useState('');
  // Ideia que originou o tema atual da aba Gerar: { id, theme }.
  const [activeIdea, setActiveIdea] = useState(null);
  const [logoImg, setLogoImg] = useState(null);

  const {
    content,
    setContent,
    updateSlide,
    updateField,
    addSlide,
    removeSlide,
  } = useDraft();

  const profile = config.profile;

  useEffect(() => {
    if (profile?.logoDataUrl) {
      loadImage(profile.logoDataUrl).then(setLogoImg);
    } else {
      setLogoImg(null);
    }
  }, [profile?.logoDataUrl]);

  const handleGenerateSuccess = ({
    content: newContent,
    theme: genTheme,
    mode: genMode = 'online',
    usedSources: srcList,
    feedErrors: errList,
  }) => {
    setContent(newContent);
    setUsedSources(srcList || []);
    setFeedErrors(errList || []);

    addHistory({
      theme: genTheme || newContent?.topic || 'Carrossel',
      mode: genMode,
      content: newContent,
    });

    // Só marca a ideia como usada se o tema gerado ainda for o dela (o usuário pode ter trocado de tema).
    if (activeIdea && (genTheme || '').startsWith(activeIdea.theme)) {
      markIdeaUsed(activeIdea.id);
    }
    setActiveIdea(null);
    setInitialTheme('');

    setActiveTab('revisao');
  };

  const handleGenerateFromIdea = (idea) => {
    const combined = (idea.theme + (idea.notes ? ` — ${idea.notes}` : '')).slice(0, 200);
    setInitialTheme(combined);
    setActiveIdea({ id: idea.id, theme: combined });
    setActiveTab('gerar');
  };

  const handleOpenHistoryInReview = (entry) => {
    if (!entry?.content) return;
    setContent(entry.content);
    setUsedSources([]);
    setFeedErrors([]);
    setActiveTab('revisao');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Pauta Pronta</h1>
        <p className="app-subtitle">Gerador e editor de carrosséis para LinkedIn e Instagram</p>
      </header>

      <nav className="tab-nav" aria-label="Abas de navegação">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="tab-content">
        {activeTab === 'gerar' && (
          <GenerateForm
            config={config}
            onSuccess={handleGenerateSuccess}
            onSaveAsIdea={(ideaData) => addIdea(ideaData)}
            onNavigateToConfig={() => setActiveTab('config')}
            initialTheme={initialTheme}
          />
        )}

        {activeTab === 'revisao' && (
          <Review
            content={content}
            setContent={setContent}
            updateSlide={updateSlide}
            updateField={updateField}
            addSlide={addSlide}
            removeSlide={removeSlide}
            profile={profile}
            logoImg={logoImg}
            usedSources={usedSources}
            feedErrors={feedErrors}
          />
        )}

        {activeTab === 'ideias' && (
          <IdeaBank
            ideas={ideas}
            onAddIdea={addIdea}
            onUpdateIdea={updateIdea}
            onRemoveIdea={removeIdea}
            onGenerateFromIdea={handleGenerateFromIdea}
          />
        )}

        {activeTab === 'historico' && (
          <HistoryList
            history={history}
            currentDraft={content}
            onOpenInReview={handleOpenHistoryInReview}
            onRemoveHistory={removeHistory}
            onClearHistory={clearHistory}
          />
        )}

        {activeTab === 'config' && (
          <div className="config-tab-container">
            <ProfileForm
              profile={profile}
              logoImg={logoImg}
              onUpdateProfile={updateProfile}
              onResetProfile={resetProfile}
            />
            <FeedsForm
              feeds={config.feeds}
              defaults={config.defaults}
              onUpdateFeeds={updateFeeds}
              onUpdateDefaults={updateDefaults}
            />
            <AccessForm
              config={config}
              onUpdateAccess={updateAccess}
            />
            <DataBackup config={config} ideas={ideas} history={history} />
          </div>
        )}
      </main>
    </div>
  );
}
