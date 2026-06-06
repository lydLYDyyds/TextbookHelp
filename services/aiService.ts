/**
 * aiService.ts — AI provider layer (v2 diagnostic engine)
 *
 * Each user turn produces:
 *   { diagnosis: DiagnosisEntry | null, response: string }
 * Diagnosis is extracted from <diagnosis> XML block, response from <response>.
 * Student model is updated locally after each turn.
 */
import { Character, ChatSession, DiagnosisEntry, GameSettings, StudentModel } from '../types';
import { buildCharacterSystemPrompt } from './prompts';

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
// Response parsing
// ============================================================

export function parseAIResponse(raw: string): { diagnosis: DiagnosisEntry | null; response: string } {
  const diagMatch = raw.match(/<diagnosis>\s*([\s\S]*?)\s*<\/diagnosis>/i);
  const respMatch = raw.match(/<response>\s*([\s\S]*?)\s*<\/response>/i);

  let diagnosis: DiagnosisEntry | null = null;
  if (diagMatch?.[1]) {
    const block = diagMatch[1].trim();
    const understanding = (block.match(/understanding:\s*(solid|partial|confused|guessing)/i)?.[1]?.toLowerCase() ?? 'partial') as DiagnosisEntry['understanding'];
    const gap = block.match(/gap:\s*(.+)/i)?.[1]?.trim() ?? '';
    const action = (block.match(/action:\s*(deepen|re_explain|advance|test)/i)?.[1]?.toLowerCase() ?? 'advance') as DiagnosisEntry['action'];
    const conceptInvolved = block.match(/concept:\s*(.+)/i)?.[1]?.trim() ?? '';

    diagnosis = {
      timestamp: Date.now(),
      understanding,
      gap,
      action,
      conceptInvolved,
    };
  }

  const response = respMatch?.[1]?.trim() ?? raw;

  return { diagnosis, response };
}

// ============================================================
// Student model update
// ============================================================

export function updateStudentModel(model: StudentModel, diagnosis: DiagnosisEntry): StudentModel {
  const MAX_DIAGNOSES = 20;
  const updated = { ...model };

  // 1. Append diagnosis
  updated.recentDiagnoses = [...(model.recentDiagnoses ?? []), diagnosis].slice(-MAX_DIAGNOSES);
  updated.updatedAt = Date.now();

  // 2. Update concept mastery
  if (diagnosis.conceptInvolved) {
    const concept = diagnosis.conceptInvolved;
    const current = updated.conceptMastery[concept] ?? 50; // start at 50 (neutral)
    const deltas: Record<string, number> = {
      solid: 5,
      partial: 2,
      confused: -10,
      guessing: -5,
    };
    const delta = deltas[diagnosis.understanding] ?? 0;
    updated.conceptMastery = {
      ...updated.conceptMastery,
      [concept]: Math.max(0, Math.min(100, current + delta)),
    };
  }

  // 3. Track weak areas
  if (diagnosis.gap && diagnosis.understanding !== 'solid') {
    const areas = [...(model.weakAreas ?? [])];
    if (!areas.includes(diagnosis.gap)) {
      areas.push(diagnosis.gap);
      updated.weakAreas = areas.slice(-10);
    }
  }

  // 4. Track common mistakes
  if (diagnosis.understanding === 'confused' && diagnosis.gap) {
    const mistakes = [...(model.commonMistakes ?? [])];
    if (!mistakes.includes(diagnosis.gap)) {
      mistakes.push(diagnosis.gap);
      updated.commonMistakes = mistakes.slice(-10);
    }
  }

  // 5. Learning style detection (simple heuristic)
  const solidCount = updated.recentDiagnoses.filter(d => d.understanding === 'solid').length;
  const confusedCount = updated.recentDiagnoses.filter(d => d.understanding === 'confused').length;
  if (updated.recentDiagnoses.length >= 5) {
    if (confusedCount >= 3) {
      updated.learningStyle = '可能需要更基础的铺垫，建议从具体例子入手';
    } else if (solidCount >= 4) {
      updated.learningStyle = '基础扎实，可以适当推进更深层的内容';
    } else {
      updated.learningStyle = '在正确方向上但需要更多练习巩固';
    }
  }

  return updated;
}

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
): Promise<{ diagnosis: DiagnosisEntry | null; response: string }> {
  const systemPrompt = buildCharacterSystemPrompt(
    character,
    settings,
    session.pdfText,
    session.studentModel,
  );

  const recentMessages = session.messages.slice(-10);
  const history = recentMessages.map(m => ({
    role: m.role === 'user' ? 'user' : ('assistant' as const),
    text: m.text,
  }));

  const payload: ChatApiCall = { systemPrompt, history, newMessage: userMessage };

  const raw =
    settings.aiProvider === 'deepseek'
      ? await callDeepSeekChat(payload)
      : await callGeminiChat(payload);

  return parseAIResponse(raw);
}

// ============================================================
// @deprecated
// ============================================================

export async function extractSubjectOutline(_pdfText: string, _settings: GameSettings) {
  return null;
}
