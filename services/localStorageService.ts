/**
 * localStorageService.ts — Client-side persistence
 *
 * Manages ChatSession[] and GameSettings in localStorage.
 * Sessions are sorted by updatedAt descending, capped at MAX_SESSIONS.
 */
import { ChatMessage, ChatSession, GameSettings } from '../types';
import { SESSION_KEY, SETTINGS_KEY, MAX_SESSIONS } from '../constants';

// ============================================================
// Low-level JSON storage
// ============================================================

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    console.warn(`Failed to parse localStorage key "${key}". Resetting to default.`);
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

// ============================================================
// File identity
// ============================================================

export const getFileSourceKey = (file: File) => {
  return `${file.name}::${file.size}::${file.lastModified}`;
};

// ============================================================
// Settings
// ============================================================

export const loadSettings = (fallback: GameSettings): GameSettings => {
  return readJson<GameSettings>(SETTINGS_KEY, fallback);
};

export const saveSettings = (settings: GameSettings) => {
  writeJson(SETTINGS_KEY, settings);
};

// ============================================================
// Chat sessions
// ============================================================

export const loadChatSessions = (): ChatSession[] => {
  return readJson<ChatSession[]>(SESSION_KEY, [])
    .filter(s => Array.isArray(s.messages))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

const saveChatSessions = (sessions: ChatSession[]) => {
  const trimmed = sessions
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_SESSIONS);
  writeJson(SESSION_KEY, trimmed);
};

export const findChatSessionBySource = (sourceKey: string): ChatSession | undefined => {
  return loadChatSessions().find(s => s.sourceKey === sourceKey);
};

export const getLatestChatSession = (): ChatSession | undefined => {
  return loadChatSessions()[0];
};

export const upsertChatSession = (session: ChatSession) => {
  const sessions = loadChatSessions();
  const next = [session, ...sessions.filter(s => s.id !== session.id)];
  saveChatSessions(next);
};

export const deleteChatSession = (sessionId: string) => {
  const sessions = loadChatSessions();
  saveChatSessions(sessions.filter(s => s.id !== sessionId));
};

const generateId = () => `cs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createChatSession = (params: {
  sourceKey: string;
  characterId: string;
  title: string;
  pdfText?: string;
}): ChatSession => {
  const now = Date.now();

  return {
    id: generateId(),
    characterId: params.characterId,
    sourceKey: params.sourceKey,
    title: params.title,
    pdfText: params.pdfText,
    messages: [],
    studentModel: {
      conceptMastery: {},
      weakAreas: [],
      learningStyle: '',
      commonMistakes: [],
      recentDiagnoses: [],
      updatedAt: 0,
    },
    createdAt: now,
    updatedAt: now,
  };
};

export const addMessageToSession = (sessionId: string, message: ChatMessage) => {
  const sessions = loadChatSessions();
  const target = sessions.find(s => s.id === sessionId);
  if (!target) {
    console.warn(`Session ${sessionId} not found. Message not saved.`);
    return;
  }

  target.messages.push(message);
  target.updatedAt = Date.now();
  upsertChatSession(target);
};

export const addMessagesToSession = (sessionId: string, messages: ChatMessage[]) => {
  const sessions = loadChatSessions();
  const target = sessions.find(s => s.id === sessionId);
  if (!target) return;

  target.messages.push(...messages);
  target.updatedAt = Date.now();
  upsertChatSession(target);
};

// ============================================================
// @deprecated — Legacy script-based session API
//   Kept so previously saved StudySession data can be migrated.
// ============================================================

/** @deprecated */
export const loadSessions = (): any[] => {
  try {
    const raw = window.localStorage.getItem('textbook2galgame.sessions.v1');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/** @deprecated Use findChatSessionBySource */
export const findSessionBySource = (_sourceKey: string): any | undefined => undefined;

/** @deprecated Use getLatestChatSession */
export const getLatestSession = (): any | undefined => undefined;

/** @deprecated Use upsertChatSession */
export const upsertSession = (_session: any) => {};

/** @deprecated Use createChatSession */
export const createSession = (_params: any): any => {
  throw new Error('createSession is deprecated. Use createChatSession.');
};

/** @deprecated Use addMessageToSession */
export const updateSessionProgress = (_sessionId: string, _progress: any) => {};
