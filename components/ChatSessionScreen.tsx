/**
 * ChatSessionScreen.tsx — Real-time chat learning interface (v2)
 *
 * Right-side LaTeX helper panel for inserting math formulas.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatSession, GameSettings, EMPTY_STUDENT_MODEL } from '../types';
import { LatexText } from './LatexText';
import { sendChatMessage, updateStudentModel } from '../services/aiService';
import { upsertChatSession } from '../services/localStorageService';
import { getCharacterById } from '../data/characters';
import { useTypewriter } from '../hooks/useTypewriter';

interface Props {
  session: ChatSession;
  settings: GameSettings;
  onExit: () => void;
  language: 'zh' | 'en';
}

const generateMsgId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ============================================================
// LaTeX symbol palette data
// ============================================================

interface LatexButton {
  label: string;
  latex: string;
  tip?: string;
}

const GREEK_LOWERCASE: LatexButton[] = [
  { label: 'α', latex: '\\alpha' }, { label: 'β', latex: '\\beta' },
  { label: 'γ', latex: '\\gamma' }, { label: 'δ', latex: '\\delta' },
  { label: 'ε', latex: '\\epsilon' }, { label: 'ζ', latex: '\\zeta' },
  { label: 'η', latex: '\\eta' }, { label: 'θ', latex: '\\theta' },
  { label: 'λ', latex: '\\lambda' }, { label: 'μ', latex: '\\mu' },
  { label: 'ν', latex: '\\nu' }, { label: 'ξ', latex: '\\xi' },
  { label: 'π', latex: '\\pi' }, { label: 'ρ', latex: '\\rho' },
  { label: 'σ', latex: '\\sigma' }, { label: 'τ', latex: '\\tau' },
  { label: 'φ', latex: '\\phi' }, { label: 'ψ', latex: '\\psi' },
  { label: 'ω', latex: '\\omega' },
];

const GREEK_UPPERCASE: LatexButton[] = [
  { label: 'Γ', latex: '\\Gamma' }, { label: 'Δ', latex: '\\Delta' },
  { label: 'Θ', latex: '\\Theta' }, { label: 'Λ', latex: '\\Lambda' },
  { label: 'Ξ', latex: '\\Xi' }, { label: 'Π', latex: '\\Pi' },
  { label: 'Σ', latex: '\\Sigma' }, { label: 'Φ', latex: '\\Phi' },
  { label: 'Ψ', latex: '\\Psi' }, { label: 'Ω', latex: '\\Omega' },
];

const OPERATORS: LatexButton[] = [
  { label: '∂', latex: '\\partial' }, { label: '∇', latex: '\\nabla' },
  { label: '∫', latex: '\\int' }, { label: '∬', latex: '\\iint' },
  { label: '∮', latex: '\\oint' }, { label: '∑', latex: '\\sum' },
  { label: '∏', latex: '\\prod' }, { label: '√', latex: '\\sqrt{}' },
  { label: '∞', latex: '\\infty' }, { label: '±', latex: '\\pm' },
  { label: '×', latex: '\\times' }, { label: '·', latex: '\\cdot' },
  { label: '⊗', latex: '\\otimes' }, { label: '⊕', latex: '\\oplus' },
  { label: '∧', latex: '\\wedge' }, { label: '∝', latex: '\\propto' },
  { label: '∼', latex: '\\sim' }, { label: '≈', latex: '\\approx' },
  { label: '≡', latex: '\\equiv' },
];

const RELATIONS: LatexButton[] = [
  { label: '≤', latex: '\\leq' }, { label: '≥', latex: '\\geq' },
  { label: '≠', latex: '\\neq' }, { label: '≪', latex: '\\ll' },
  { label: '≫', latex: '\\gg' }, { label: '⊂', latex: '\\subset' },
  { label: '⊃', latex: '\\supset' }, { label: '⊆', latex: '\\subseteq' },
  { label: '∈', latex: '\\in' }, { label: '∉', latex: '\\notin' },
  { label: '∀', latex: '\\forall' }, { label: '∃', latex: '\\exists' },
  { label: '→', latex: '\\to' }, { label: '⇒', latex: '\\Rightarrow' },
  { label: '⇔', latex: '\\Leftrightarrow' }, { label: '↦', latex: '\\mapsto' },
];

const BRACKETS: LatexButton[] = [
  { label: '(·)', latex: '\\left(  \\right)', tip: '括号' },
  { label: '[·]', latex: '\\left[  \\right]', tip: '方括号' },
  { label: '{·}', latex: '\\left\\{  \\right\\}', tip: '花括号' },
  { label: '⟨·⟩', latex: '\\langle  \\rangle', tip: '尖括号' },
  { label: '|·|', latex: '\\left|  \\right|', tip: '绝对值' },
  { label: '‖·‖', latex: '\\left\\|  \\right\\|', tip: '范数' },
];

const TEMPLATES: LatexButton[] = [
  { label: '分式', latex: '\\frac{}{}', tip: '分数' },
  { label: '上标', latex: '^{}', tip: '指数' },
  { label: '下标', latex: '_{}', tip: '下标' },
  { label: '定积分', latex: '\\int_{}^{}  \\,d', tip: '定积分' },
  { label: '求和', latex: '\\sum_{}^{}', tip: '求和' },
  { label: '极限', latex: '\\lim_{ \\to }', tip: '极限' },
  { label: '矩阵2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', tip: '2×2矩阵' },
  { label: '矩阵3', latex: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', tip: '3×3矩阵' },
  { label: 'cases', latex: '\\begin{cases}  & \\text{if } \\\\  & \\text{otherwise} \\end{cases}', tip: '分段函数' },
  { label: 'aligned', latex: '\\begin{aligned}  &=  \\\\ &=  \\end{aligned}', tip: '多行对齐' },
  { label: '框', latex: '\\boxed{}', tip: '加框' },
  { label: 'text', latex: '\\text{}', tip: '文本' },
  { label: 'hat', latex: '\\hat{}', tip: '帽子' },
  { label: 'bar', latex: '\\bar{}', tip: '上划线' },
  { label: 'vec', latex: '\\vec{}', tip: '向量' },
  { label: 'dot', latex: '\\dot{}', tip: '点' },
  { label: 'ddot', latex: '\\ddot{}', tip: '双点' },
  { label: 'tilde', latex: '\\tilde{}', tip: '波浪号' },
];

const ARROWS_DOTS: LatexButton[] = [
  { label: '…', latex: '\\dots' }, { label: '⋯', latex: '\\cdots' },
  { label: '⋮', latex: '\\vdots' }, { label: '⋱', latex: '\\ddots' },
  { label: '←', latex: '\\leftarrow' }, { label: '→', latex: '\\rightarrow' },
  { label: '⇐', latex: '\\Leftarrow' }, { label: '⇒', latex: '\\Rightarrow' },
  { label: '↔', latex: '\\leftrightarrow' }, { label: '↑', latex: '\\uparrow' },
  { label: '↓', latex: '\\downarrow' },
];

// ============================================================
// LaTeX helper sub-component
// ============================================================

const LatexHelper: React.FC<{
  open: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  zh: boolean;
}> = ({ open, onClose, onInsert, zh }) => {
  const [tab, setTab] = useState('templates');

  if (!open) return null;

  const tabs: Record<string, { label: string; data: LatexButton[] }> = {
    templates: { label: zh ? '模板' : 'Templates', data: TEMPLATES },
    greek: { label: zh ? '希腊' : 'Greek', data: [...GREEK_LOWERCASE, ...GREEK_UPPERCASE] },
    operators: { label: zh ? '算符' : 'Operators', data: OPERATORS },
    relations: { label: zh ? '关系' : 'Relations', data: RELATIONS },
    brackets: { label: zh ? '括号' : 'Brackets', data: BRACKETS },
    accents: { label: zh ? '标记' : 'Accents', data: ARROWS_DOTS },
  };

  const currentData = tabs[tab]?.data ?? [];

  return (
    <div className="w-[260px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-bold text-gray-600">
          <i className="fas fa-square-root-alt mr-1 text-blue-400" />
          LaTeX
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xs">
          <i className="fas fa-times" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-100">
        {Object.entries(tabs).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
              tab === key ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Buttons grid */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-3 gap-1">
          {currentData.map((btn, i) => (
            <button
              key={`${tab}-${i}`}
              onClick={() => onInsert(btn.latex)}
              title={btn.tip ?? btn.latex}
              className="px-1 py-1.5 rounded text-[11px] font-mono bg-gray-50 hover:bg-blue-100 hover:text-blue-700 border border-gray-100 transition-colors truncate text-center"
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Main component
// ============================================================

export const ChatSessionScreen: React.FC<Props> = ({ session, settings, onExit, language }) => {
  const zh = language === 'zh';
  const character = getCharacterById(session.characterId, settings.customCharacters);

  const [messages, setMessages] = useState<ChatMessage[]>(session.messages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLatex, setShowLatex] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter for the latest character message
  const lastCharMsg = [...messages].reverse().find(m => m.role === 'character');
  const lastCharText = lastCharMsg?.text ?? '';
  const { displayedText, isTyping } = useTypewriter(lastCharText, true);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText, isLoading]);

  useEffect(() => {
    if (!isLoading && !isTyping) {
      inputRef.current?.focus();
    }
  }, [isLoading, isTyping]);

  // Insert LaTeX at cursor position
  const insertLatex = useCallback((latex: string) => {
    const el = inputRef.current;
    if (!el) {
      setInput(prev => prev + latex);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = input.slice(0, start);
    const after = input.slice(end);

    // Wrap in $...$ if not already inside math mode
    const needsWrapper = !before.endsWith('$') || after.startsWith('$');
    const text = needsWrapper ? `$${latex}$` : latex;

    setInput(before + text + after);

    // Restore cursor inside the inserted text
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + text.length;
      el.setSelectionRange(cursor, cursor);
    });
  }, [input]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading || !character) return;

    const userMsg: ChatMessage = {
      id: generateMsgId(),
      role: 'user',
      text: trimmed,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    const snapshot: ChatSession = { ...session, messages: updatedMessages };

    try {
      const { diagnosis, response } = await sendChatMessage(snapshot, character, trimmed, settings);

      const charMsg: ChatMessage = {
        id: generateMsgId(),
        role: 'character',
        text: response,
        timestamp: Date.now(),
      };

      let updatedModel = snapshot.studentModel ?? EMPTY_STUDENT_MODEL;
      if (diagnosis) {
        updatedModel = updateStudentModel(updatedModel, diagnosis);
      }

      const updatedSession: ChatSession = {
        ...snapshot,
        messages: [...updatedMessages, charMsg],
        studentModel: updatedModel,
        updatedAt: Date.now(),
      };

      setMessages(prev => [...prev, charMsg]);
      upsertChatSession(updatedSession);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, character, messages, session, settings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showLatex) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterColor = character?.color ?? 'pink';
  const colorMap: Record<string, string> = {
    sky: 'bg-sky-500', rose: 'bg-rose-500', violet: 'bg-violet-500',
    pink: 'bg-pink-500', purple: 'bg-purple-500', amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };
  const avatarBg = colorMap[characterColor] ?? 'bg-pink-500';

  const renderMessage = (msg: ChatMessage, _idx: number) => {
    const isUser = msg.role === 'user';
    const isLatestChar = msg.role === 'character' && msg === lastCharMsg;

    return (
      <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        {!isUser && (
          <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-lg flex-shrink-0 mr-2.5 mt-1`}>
            {character?.avatar ?? '🤖'}
          </div>
        )}
        <div className={`max-w-[75%] ${isUser ? 'order-1' : ''}`}>
          {!isUser && (
            <div className="text-xs text-gray-400 mb-1 font-semibold ml-1">
              {character?.name ?? 'Tutor'}
            </div>
          )}
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? 'bg-blue-500 text-white rounded-tr-sm'
                : 'bg-white border border-gray-200 rounded-tl-sm shadow-sm'
            }`}
          >
            {isLatestChar && isTyping ? (
              <>
                <LatexText text={displayedText} />
                <span className="inline-block w-1.5 h-5 bg-gray-400 ml-0.5 animate-pulse rounded-sm" />
              </>
            ) : (
              <LatexText text={msg.text} />
            )}
          </div>
          {isUser && (
            <div className="text-xs text-gray-400 mt-1 text-right mr-1">
              {zh ? '我' : 'Me'}
            </div>
          )}
        </div>
        {isUser && (
          <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center text-sm flex-shrink-0 ml-2.5 mt-1">
            👤
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#f5f0eb]">
      {/* ── Top bar ── */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onExit} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" title={zh ? '退出' : 'Exit'}>
            <i className="fas fa-arrow-left text-lg" />
          </button>
          <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-base flex-shrink-0`}>
            {character?.avatar ?? '🤖'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">{character?.name ?? (zh ? '导师' : 'Tutor')}</div>
            <div className="text-xs text-gray-400 truncate">{character?.subjectLabel ?? session.title}</div>
          </div>
        </div>
        <button
          onClick={() => setShowLatex(!showLatex)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            showLatex ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          <i className="fas fa-square-root-alt mr-1" />
          LaTeX
        </button>
      </div>

      {/* ── Body: messages + optional LaTeX panel ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {messages.length === 0 && (
            <div className="flex justify-center my-12">
              <div className="bg-white/90 border border-pink-200 rounded-2xl px-6 py-4 shadow-sm text-center max-w-sm">
                <div className="text-2xl mb-2">{character?.avatar ?? '📖'}</div>
                <div className="text-sm font-bold text-pink-700">
                  {character?.name ?? (zh ? '导师' : 'Tutor')}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {zh
                    ? `${character?.subjectLabel ?? '多领域'} · 发送第一条消息开始学习吧`
                    : `${character?.subjectLabel ?? 'Multi-domain'} · Send your first message to begin`}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => renderMessage(msg, idx))}

          {isLoading && (
            <div className="flex justify-start mb-4">
              <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-lg flex-shrink-0 mr-2.5 mt-1`}>
                {character?.avatar ?? '🤖'}
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1 font-semibold ml-1">{character?.name ?? 'Tutor'}</div>
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center my-2">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600">
                <i className="fas fa-exclamation-circle mr-1" /> {error}
                <button onClick={() => setError(null)} className="ml-2 underline hover:no-underline">
                  {zh ? '关闭' : 'Dismiss'}
                </button>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* LaTeX helper panel */}
        <LatexHelper open={showLatex} onClose={() => setShowLatex(false)} onInsert={insertLatex} zh={zh} />
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur border-t border-gray-200 p-3 z-10">
        <div className="flex gap-2 items-end max-w-3xl">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={zh ? '输入你的问题或回答（使用右侧 LaTeX 面板插入公式）...' : 'Ask or respond (use LaTeX panel on the right)...'}
            className="flex-1 min-h-[44px] max-h-32 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none"
            rows={1}
            disabled={isLoading || isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors flex-shrink-0"
          >
            <i className="fas fa-paper-plane" />
          </button>
        </div>
      </div>
    </div>
  );
};
