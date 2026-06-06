/**
 * aiService.ts — AI provider layer
 *
 * Handles communication with Gemini and DeepSeek backends through
 * the Vite dev-server proxies at /api/gemini/chat and /api/deepseek/chat.
 *
 * Primary entry points:
 *   createChatSession()  — PDF → ChatSession (extracts text + optional outline)
 *   sendChatMessage()    — sends user message + history → character reply
 *
 * @deprecated Legacy:
 *   analyzeTextbook(), evaluateStudentAnswer() — old script-generation flow
 */
import { Character, ChatSession, GameSettings } from '../types';
import {
  buildCharacterSystemPrompt,
  buildSubjectOutlinePrompt,
  subjectOutlineSchema,
} from './prompts';
import { parseJsonResponse } from './jsonParser';

// ============================================================
// HTTP helpers
// ============================================================

const fetchWithRetry = async (url: string, options: RequestInit, retries = 2): Promise<Response> => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || attempt === retries) return response;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  throw new Error('Unreachable');
};

// ============================================================
// Chat API calls
// ============================================================

interface ChatApiCall {
  systemPrompt: string;
  history: Array<{ role: string; text: string }>;
  newMessage: string;
}

const callGeminiChat = async (payload: ChatApiCall, model = 'gemini-2.5-flash'): Promise<string> => {
  const response = await fetchWithRetry('/api/gemini/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: payload.systemPrompt,
      history: payload.history,
      newMessage: payload.newMessage,
      model,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `Gemini request failed with HTTP ${response.status}`);
  }

  const content = data?.content;
  if (!content) throw new Error('No response from Gemini');
  return content;
};

const callDeepSeekChat = async (payload: ChatApiCall): Promise<string> => {
  const response = await fetchWithRetry('/api/deepseek/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemPrompt: payload.systemPrompt,
      history: payload.history,
      newMessage: payload.newMessage,
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || `DeepSeek request failed with HTTP ${response.status}`);
  }

  const content = data?.content;
  if (!content) throw new Error('No response from DeepSeek');
  return content;
};

// ============================================================
// Public API
// ============================================================

export async function sendChatMessage(
  session: ChatSession,
  character: Character,
  userMessage: string,
  settings: GameSettings,
): Promise<string> {
  const systemPrompt = buildCharacterSystemPrompt(character, settings, session.pdfText);

  const recentMessages = session.messages.slice(-10);
  const history = recentMessages.map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant' as const,
    text: m.text,
  }));

  const payload: ChatApiCall = { systemPrompt, history, newMessage: userMessage };

  if (settings.aiProvider === 'deepseek') {
    return await callDeepSeekChat(payload);
  }
  return await callGeminiChat(payload);
}

export async function extractSubjectOutline(
  pdfText: string,
  settings: GameSettings,
): Promise<{ title: string; outline: string; prerequisites: string[]; difficulty: string } | null> {
  const prompt = buildSubjectOutlinePrompt(pdfText, settings);

  try {
    let content: string;
    if (settings.aiProvider === 'deepseek') {
      const response = await fetchWithRetry('/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, pdfText: '' }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'DeepSeek outline failed');
      content = data?.content || '';
    } else {
      const response = await fetchWithRetry('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'gemini-2.5-flash',
          responseSchema: subjectOutlineSchema,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || 'Gemini outline failed');
      content = data?.content || '';
    }

    return parseJsonResponse<{ title: string; outline: string; prerequisites: string[]; difficulty: string }>(content);
  } catch (error) {
    console.error('Failed to extract subject outline:', error);
    return null; // Non-fatal — chat can proceed without outline
  }
}

// @deprecated
import { AnswerFeedback } from '../types';

export async function analyzeTextbook(
  _file: File,
  _settings: GameSettings,
  _onProgress?: (message: string) => void,
): Promise<{ title: string; script: any[] }> {
  throw new Error(
    'analyzeTextbook() has been deprecated. Use sendChatMessage() for real-time chat learning.',
  );
}

export async function evaluateStudentAnswer(
  _line: any, _answer: string, _context: any[], _settings: GameSettings,
): Promise<AnswerFeedback> {
  // In real-time chat mode, evaluation is done naturally by the character in conversation.
  // Return a generic fallback so the UI doesn't crash if this is somehow called.
  return {
    score: 0,
    verdict: 'partial' as const,
    feedback: 'Evaluation is now handled naturally in conversation.',
  };
}
