import { GameSettings, PersonalityProfile } from '../types';
import { parseJsonResponse } from './jsonParser';

const buildDistillPrompt = (chatText: string, settings: GameSettings) => {
  const lang = settings.dialogueLanguage === 'zh'
    ? 'Respond in Simplified Chinese. Profile field names should remain in English.'
    : 'Respond in English.';

  return `
You are a communication style analyst. Analyze the following chat history and extract the speaker's communication style profile.

${lang}

Chat history (the speaker's messages only):
"""
${chatText.slice(0, 30000)}
"""

Analyze the speaker's communication patterns and return a JSON profile with these fields:
- speakingStyle: A 1-2 sentence description of their overall speaking style (e.g., "Direct and concise, often uses humor", "Warm and elaborate, asks lots of follow-up questions")
- commonPhrases: Array of 3-5 phrases or expressions they use frequently
- emojiStyle: Description of their emoji/emoticon usage habits (e.g., "Frequently uses 😂 and 🙏", "Rarely uses emojis", "Prefers kaomoji like (╯‵□′)╯")
- questionStyle: How they ask questions (e.g., "Direct yes/no questions", "Rhetorical questions", "Open-ended exploratory questions")
- sentenceLength: One of: "short" (mostly <15 chars), "medium" (15-40 chars), "long" (>40 chars), "varied"
- formalityLevel: "very casual", "casual", "neutral", "formal", or "very formal"
- codeSwitching: Description of Chinese-English mixing patterns (e.g., "Often inserts English technical terms", "Pure Chinese", "Frequent full-sentence code-switching")
- rawSummary: A paragraph (3-5 sentences) that vividly describes this person's communication style, as if introducing their "chat personality" to someone else. This will be used to adapt an AI character to sound like them.

Return ONLY valid JSON. No markdown, no extra text.
`;
};

export const parseChatFile = async (file: File): Promise<string> => {
  const text = await file.text();

  // Detect format and clean
  const lines = text.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try to detect WeChat export formats and extract only the user's messages
    // Common formats:
    // 2024-01-15 14:30:32 用户名: 消息内容
    // 用户名 2024-01-15 14:30:32\n消息内容
    // [用户名] 消息内容

    // Pattern 1: "YYYY-MM-DD HH:MM:SS Name: Content"
    const pattern1 = trimmed.match(/^\d{4}[-/]\d{2}[-/]\d{2}\s+\d{2}:\d{2}(:\d{2})?\s+([^:]+?)[:：]\s*(.+)/);
    if (pattern1) {
      cleaned.push(pattern1[3].trim());
      continue;
    }

    // Pattern 2: "Name 2024-01-15 14:30"
    const pattern2 = trimmed.match(/^([^\d]+?)\s+\d{4}[-/]\d{2}[-/]\d{2}/);
    if (pattern2) {
      continue; // Skip timestamp lines, the next line(s) will be the message
    }

    // Pattern 3: "[Name] Content" or "Name: Content"
    const pattern3 = trimmed.match(/^\[?([^\]\n]+?)\]?\s*[:：]\s*(.+)/);
    if (pattern3 && pattern3[0].length < 200) {
      cleaned.push(pattern3[2].trim());
      continue;
    }

    // Pattern 4: CSV format "Name,Message,Timestamp"
    if (trimmed.includes(',')) {
      const parts = trimmed.split(',');
      if (parts.length >= 2) {
        cleaned.push(parts.slice(1).join(',').replace(/^["']|["']$/g, '').trim());
        continue;
      }
    }

    // Otherwise, treat as plain message content (if it looks like a message)
    if (trimmed.length > 3 && !trimmed.startsWith('=') && !trimmed.startsWith('-')) {
      cleaned.push(trimmed);
    }
  }

  // Deduplicate and limit
  const unique = [...new Set(cleaned)].filter(s => s.length > 2);
  return unique.join('\n').slice(0, 40000);
};

export const distillPersonality = async (
  chatText: string,
  settings: GameSettings,
): Promise<PersonalityProfile> => {
  const prompt = buildDistillPrompt(chatText, settings);
  const isGemini = settings.aiProvider === 'gemini';

  const endpoint = isGemini ? '/api/gemini/chat' : '/api/deepseek/chat';
  const body = isGemini
    ? JSON.stringify({
        prompt,
        model: 'gemini-2.5-flash',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            speakingStyle: { type: 'STRING' },
            commonPhrases: { type: 'ARRAY', items: { type: 'STRING' } },
            emojiStyle: { type: 'STRING' },
            questionStyle: { type: 'STRING' },
            sentenceLength: { type: 'STRING' },
            formalityLevel: { type: 'STRING' },
            codeSwitching: { type: 'STRING' },
            rawSummary: { type: 'STRING' },
          },
          required: ['speakingStyle', 'commonPhrases', 'emojiStyle', 'questionStyle', 'sentenceLength', 'formalityLevel', 'codeSwitching', 'rawSummary'],
        },
      })
    : JSON.stringify({ prompt, pdfText: chatText });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `Distill request failed with HTTP ${response.status}`);
  }

  const content = payload?.content;
  if (!content) throw new Error('No response from AI for personality distillation');

  const profile = parseJsonResponse<Omit<PersonalityProfile, 'createdAt' | 'sourceDesc'>>(content);
  return {
    ...profile,
    createdAt: Date.now(),
    sourceDesc: '',
  };
};
