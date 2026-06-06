/**
 * App.tsx — Application root
 *
 * State machine: TITLE → UPLOAD → CHAT
 * Side routes: SETTINGS, RESOURCES, PERSONALITY_DISTILL
 *
 * The app converts uploaded PDF textbooks into interactive chat-based
 * learning sessions with AI-powered character tutors.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { TitleScreen } from './components/TitleScreen';
import { UploadScreen } from './components/UploadScreen';
import { PersonalityDistillScreen } from './components/PersonalityDistillScreen';
import { ChatSessionScreen } from './components/ChatSessionScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ResourceLibraryScreen } from './components/ResourceLibraryScreen';
import { ChatSession, GameSettings } from './types';
import {
  loadSettings,
  saveSettings,
  getLatestChatSession,
} from './services/localStorageService';

export enum AppState {
  TITLE,
  UPLOAD,
  CHAT,
  SETTINGS,
  RESOURCES,
  PERSONALITY_DISTILL,
}

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.TITLE);
  const [skipPDF, setSkipPDF] = useState(false);
  const defaultSettings = useMemo<GameSettings>(() => ({
    detailLevel: 'detailed',
    personality: 'gentle',
    learningMode: 'socratic',
    aiProvider: 'gemini',
    uiLanguage: 'zh',
    dialogueLanguage: 'zh',
    activeCharacterId: 'prof-lin', // default to 林教授
  }), []);
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings(defaultSettings));
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [hasSavedSession, setHasSavedSession] = useState(false);

  useEffect(() => {
    setHasSavedSession(Boolean(getLatestChatSession()));
  }, [currentState]);

  const openSession = (session: ChatSession) => {
    setActiveSession(session);
    setCurrentState(AppState.CHAT);
  };

  const handleSessionCreated = (session: ChatSession) => {
    openSession(session);
    setHasSavedSession(true);
  };

  const handleResume = () => {
    const latest = getLatestChatSession();
    if (latest) openSession(latest);
  };

  const handleBackToTitle = () => {
    setCurrentState(AppState.TITLE);
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden font-serif select-none">
      <div className="absolute inset-0 z-0">
        {currentState === AppState.CHAT ? (
          <div className="w-full h-full bg-gradient-to-br from-slate-50 via-blue-50 to-pink-50" />
        ) : (
          <div className="w-full h-full bg-pink-50 relative overflow-hidden">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, #ff9eb5 25%, transparent 25%, transparent 50%, #ff9eb5 50%, #ff9eb5 75%, transparent 75%, transparent)',
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute top-10 left-10 text-gal-pink-dark opacity-30 text-6xl animate-float">*</div>
            <div className="absolute bottom-20 right-20 text-gal-pink-dark opacity-30 text-8xl animate-float" style={{ animationDelay: '1s' }}>*</div>
            <div className="absolute top-1/2 left-1/3 text-gal-blue opacity-20 text-4xl animate-float" style={{ animationDelay: '2s' }}>*</div>
          </div>
        )}
      </div>

      <div className="relative z-10 w-full h-full">
        {currentState === AppState.TITLE && (
          <TitleScreen
            onStart={() => { setSkipPDF(false); setCurrentState(AppState.UPLOAD); }}
            onDirectStart={() => { setSkipPDF(true); setCurrentState(AppState.UPLOAD); }}
            onResume={handleResume}
            hasSavedSession={hasSavedSession}
            onResources={() => setCurrentState(AppState.RESOURCES)}
            onSettings={() => setCurrentState(AppState.SETTINGS)}
            language={settings.uiLanguage}
          />
        )}

        {currentState === AppState.SETTINGS && (
          <SettingsScreen
            currentSettings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              saveSettings(newSettings);
              setCurrentState(AppState.TITLE);
            }}
            onBack={() => setCurrentState(AppState.TITLE)}
            onPersonalityDistill={() => setCurrentState(AppState.PERSONALITY_DISTILL)}
            language={settings.uiLanguage}
          />
        )}

        {currentState === AppState.PERSONALITY_DISTILL && (
          <PersonalityDistillScreen
            settings={settings}
            onSave={(profile) => {
              const newSettings = {
                ...settings,
                useDistilledPersonality: true,
                personalityProfile: profile,
              };
              setSettings(newSettings);
              saveSettings(newSettings);
            }}
            onBack={() => setCurrentState(AppState.SETTINGS)}
            language={settings.uiLanguage}
          />
        )}

        {currentState === AppState.RESOURCES && (
          <ResourceLibraryScreen
            onBack={() => setCurrentState(AppState.TITLE)}
            onImport={() => setCurrentState(AppState.UPLOAD)}
            language={settings.uiLanguage}
          />
        )}

        {currentState === AppState.UPLOAD && (
          <UploadScreen
            onSessionCreated={handleSessionCreated}
            onBack={handleBackToTitle}
            settings={settings}
            skipPDF={skipPDF}
          />
        )}

        {currentState === AppState.CHAT && activeSession && (
          <ChatSessionScreen
            session={activeSession}
            settings={settings}
            onExit={handleBackToTitle}
            language={settings.uiLanguage}
          />
        )}

        {/* Fallback if CHAT state without session */}
        {currentState === AppState.CHAT && !activeSession && (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-400 text-lg">
              {settings.uiLanguage === 'zh' ? '加载会话失败，请返回重试。' : 'Failed to load session. Please go back and retry.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
