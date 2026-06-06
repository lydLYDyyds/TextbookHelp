/**
 * types.ts — Shared TypeScript types
 *
 * Core domain types for the learning assistant:
 *   Character       — AI tutor persona (built-in or custom)
 *   ChatMessage     — a single turn in a real-time chat session
 *   ChatSession     — persisted real-time chat with conversation history
 *   GameSettings    — user-configurable learning preferences
 *   PersonalityProfile — AI-distilled communication style profile
 *   StudyResource   — curated advanced math/physics reference
 *
 * @deprecated Legacy script-based types (kept for backward compat with saved sessions):
 *   DialogueLine, StudySession, TextbookStudyResponse
 */

// ============================================================
// Character system
// ============================================================

export interface Character {
  id: string;
  name: string;
  avatar: string;          // emoji or image path
  subjectLabel: string;    // "广义相对论 / 微分几何"
  subjectDomain: string;   // detailed subject description
  persona: string;         // injected into system prompt
  speakingStyle: string;   // short summary for UI
  color: string;           // theme color (tailwind classes)
  isBuiltin: boolean;
}

// ============================================================
// Real-time chat types
// ============================================================

export interface ChatMessage {
  id: string;
  role: 'character' | 'user' | 'system';
  text: string;
  timestamp: number;
  /** AI can tag messages to trigger special UI treatment */
  interactType?: 'question' | 'feynman' | 'summary';
}

export interface ChatSession {
  id: string;
  characterId: string;
  sourceKey: string;         // PDF identifier (name::size::lastModified)
  title: string;
  pdfText: string;           // extracted PDF content (truncated)
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Settings
// ============================================================

export interface GameSettings {
  detailLevel: 'brief' | 'detailed' | 'academic';
  /** @deprecated Replaced by activeCharacterId + Character.persona. Kept for backward compat. */
  personality?: 'tsundere' | 'gentle' | 'strict';
  learningMode: 'guided' | 'socratic' | 'feynman';
  aiProvider: 'gemini' | 'deepseek';
  uiLanguage: 'zh' | 'en';
  dialogueLanguage: 'zh' | 'en';
  /** Currently selected character ID */
  activeCharacterId?: string;
  /** Custom characters created via personality distillation */
  customCharacters?: Character[];
  useDistilledPersonality?: boolean;
  personalityProfile?: PersonalityProfile;
}

// ============================================================
// Personality distillation (kept from original)
// ============================================================

export interface PersonalityProfile {
  createdAt: number;
  sourceDesc: string;
  speakingStyle: string;
  commonPhrases: string[];
  emojiStyle: string;
  questionStyle: string;
  sentenceLength: string;
  formalityLevel: string;
  codeSwitching: string;
  rawSummary: string;
}

// ============================================================
// Answer feedback
// ============================================================

export interface AnswerFeedback {
  score: number;
  verdict: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  followUp?: string;
}

// ============================================================
// Resource library
// ============================================================

export type ResourceLevel = 'advanced-undergraduate' | 'graduate' | 'research';

export interface StudyResource {
  id: string;
  title: string;
  author: string;
  category: string;
  level: ResourceLevel;
  type: 'course' | 'lecture-notes' | 'pdf' | 'book' | 'reference';
  url: string;
  summary: string;
  bridge: string;
  prerequisites: string[];
  tags: string[];
}

// ============================================================
// @deprecated — Legacy script-based types
//   Kept so previously saved StudySession data can still be read.
//   New code should use ChatSession + ChatMessage instead.
// ============================================================

/** @deprecated Use ChatMessage instead */
export interface DialogueLine {
  speaker: string;
  text: string;
  emotion: 'normal' | 'happy' | 'angry' | 'surprised' | 'shy' | 'proud';
  note?: string;
  kind?: 'dialogue' | 'socratic' | 'qa' | 'feynman';
  question?: string;
  hint?: string;
  expectedAnswer?: string;
  explanation?: string;
}

/** @deprecated Use ChatSession instead */
export interface TextbookStudyResponse {
  title: string;
  script: DialogueLine[];
}

/** @deprecated Use ChatSession instead */
export interface StudySession {
  id: string;
  sourceKey: string;
  title: string;
  script: DialogueLine[];
  currentIndex: number;
  answers: Record<number, string>;
  submitted: Record<number, boolean>;
  feedback: Record<number, AnswerFeedback>;
  createdAt: number;
  updatedAt: number;
}
