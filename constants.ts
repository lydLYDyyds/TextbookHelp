// ============================================================
// Session persistence
// ============================================================
export const MAX_SESSIONS = 12;
export const SESSION_KEY = 'textbook2galgame.sessions.v2';
/** @deprecated Legacy key for old script-based sessions */
export const LEGACY_SESSION_KEY = 'textbook2galgame.sessions.v1';
export const SETTINGS_KEY = 'textbook2galgame.settings.v2';

// ============================================================
// Tesseract OCR
// ============================================================
export const TESSERACT_WORKER_PATH = '/ocr/worker.min.js';
export const TESSERACT_CORE_PATH = '/ocr/core';
export const TESSERACT_LANG_PATH = '/tessdata';
export const OCR_RENDER_SCALE = 2;
export const MIN_SELECTABLE_TEXT_CHARS = 200;

// ============================================================
// AI
// ============================================================
export const GEMINI_MODEL = 'gemini-2.5-flash';
export const DEEPSEEK_MODEL = 'deepseek-v4-pro';
export const DEFAULT_MAX_TOKENS = 8192;
export const DEFAULT_TEMPERATURE = 0.4;
export const AI_REQUEST_TIMEOUT_MS = 60_000;
export const AI_FETCH_RETRIES = 2;

// ============================================================
// Chat
// ============================================================
export const CHAT_CONTEXT_MESSAGES = 10;     // recent messages sent as context
export const CHAT_PDF_CHAR_LIMIT = 30_000;   // max PDF chars sent with system prompt

// ============================================================
// UI
// ============================================================
export const TYPING_SPEED_MS = 30;
export const PROGRESS_SAVE_INTERVAL_MS = 5000;

// ============================================================
// PDF
// ============================================================
export const MAX_PDF_SIZE_MB = 200;
export const MAX_OCR_PAGES_BRIEF = 20;
export const MAX_OCR_PAGES_ACADEMIC = 30;
export const MAX_TEXT_CHARS_BRIEF = 180000;
export const MAX_TEXT_CHARS_ACADEMIC = 260000;
