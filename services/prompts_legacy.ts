/**
 * prompts_legacy.ts — @deprecated Old script-generation prompts
 *
 * Kept for reference. New code should use the character-based system in prompts.ts.
 */
import { DialogueLine, GameSettings } from '../types';

export function buildPrompt(settings: GameSettings, _sourceMode: 'pdf' | 'text'): string {
  const dialogueLanguage = settings.dialogueLanguage === 'zh'
    ? 'Write mentor dialogue, questions, hints, expected answers, and explanations in Simplified Chinese.'
    : 'Write mentor dialogue, questions, hints, expected answers, and explanations in English.';

  return `You are Abo, a study mentor. ${dialogueLanguage}

Task: Convert the uploaded PDF into an interactive Galgame study script.

Role:
1. Address the student as a study partner.
2. Use Socratic questioning as your primary teaching method.
3. This is a chat conversation. Keep individual messages focused.

Return only valid JSON matching the schema.`;
}

export const responseSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    script: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          speaker: { type: 'STRING', enum: ['Abo'] },
          text: { type: 'STRING' },
          emotion: { type: 'STRING', enum: ['normal', 'happy', 'angry', 'surprised', 'shy', 'proud'] },
          kind: { type: 'STRING', enum: ['dialogue', 'socratic', 'qa', 'feynman'], nullable: true },
          question: { type: 'STRING', nullable: true },
          hint: { type: 'STRING', nullable: true },
          expectedAnswer: { type: 'STRING', nullable: true },
          explanation: { type: 'STRING', nullable: true },
        },
        required: ['speaker', 'text', 'emotion'],
      },
    },
  },
  required: ['title', 'script'],
};

export const answerFeedbackSchema = {
  type: 'OBJECT',
  properties: {
    score: { type: 'NUMBER' },
    verdict: { type: 'STRING', enum: ['correct', 'partial', 'incorrect'] },
    feedback: { type: 'STRING' },
    followUp: { type: 'STRING', nullable: true },
  },
  required: ['score', 'verdict', 'feedback'],
};

export function buildAnswerFeedbackPrompt(
  line: DialogueLine,
  answer: string,
  _context: DialogueLine[],
  settings: GameSettings,
): string {
  const lang = settings.dialogueLanguage === 'zh'
    ? 'Respond in Simplified Chinese.'
    : 'Respond in English.';

  return `You are a tutor. Evaluate the student's answer.
${lang}

Question: ${line.question || line.text}
Reference: ${line.expectedAnswer || line.explanation || ''}
Student answer: ${answer}

Return JSON with score (0-100), verdict (correct/partial/incorrect), and feedback.`;
}
