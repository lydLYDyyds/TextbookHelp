/**
 * ChatSessionScreen.tsx — Real-time chat learning interface
 *
 * Core chat experience: user sends messages, AI character responds in real time.
 * Character persona + PDF content are injected as system context.
 * Messages are persisted to localStorage after each exchange.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, ChatSession, GameSettings } from '../types';
import { LatexText } from './LatexText';
import { sendChatMessage } from '../services/aiService';
import { addMessagesToSession } from '../services/localStorageService';
import { getCharacterById } from '../data/characters';
import { useTypewriter } from '../hooks/useTypewriter';

interface Props {
  session: ChatSession;
  settings: GameSettings;
  onExit: () => void;
  language: 'zh' | 'en';
}

const generateMsgId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const ChatSessionScreen: React.FC<Props> = ({ session, settings, onExit, language }) => {
  const zh = language === 'zh';
  const character = getCharacterById(session.characterId, settings.customCharacters);

  const [messages, setMessages] = useState<ChatMessage[]>(session.messages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial greeting
  const [hasGreeted, setHasGreeted] = useState(session.messages.length > 0);

  // Typewriter for the latest character message
  const lastCharMsg = [...messages].reverse().find(m => m.role === 'character');
  const lastCharText = lastCharMsg?.text ?? '';
  const { displayedText, isTyping } = useTypewriter(lastCharText, true);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, displayedText, isLoading]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading && !isTyping) {
      inputRef.current?.focus();
    }
  }, [isLoading, isTyping]);

  // Send initial greeting on mount
  useEffect(() => {
    if (!hasGreeted && character && !isLoading) {
      setIsLoading(true);
      const greetingPrompt = zh
        ? '你好！我们开始学习吧。请先简单介绍一下你自己，然后看看我上传的材料，告诉我今天我们要学什么，以及你打算怎么带我学。'
        : "Hi! Let's start learning. Please introduce yourself briefly, then look at the material I uploaded and tell me what we'll learn today and your plan.";

      sendChatMessage(session, character, greetingPrompt, settings)
        .then(reply => {
          const msg: ChatMessage = {
            id: generateMsgId(),
            role: 'character',
            text: reply,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, msg]);
          addMessagesToSession(session.id, [msg]);
          setHasGreeted(true);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : String(err));
        })
        .finally(() => setIsLoading(false));
    }
  }, [hasGreeted, character]);

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

    // Build an updated session snapshot for the API call
    const snapshot: ChatSession = { ...session, messages: updatedMessages };

    try {
      const reply = await sendChatMessage(snapshot, character, trimmed, settings);
      const charMsg: ChatMessage = {
        id: generateMsgId(),
        role: 'character',
        text: reply,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, charMsg]);
      addMessagesToSession(session.id, [userMsg, charMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, character, messages, session, settings]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const characterColor = character?.color ?? 'pink';
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    pink: 'bg-pink-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    rose: 'bg-rose-500',
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
          <button
            onClick={onExit}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            title={zh ? '退出' : 'Exit'}
          >
            <i className="fas fa-arrow-left text-lg" />
          </button>
          <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center text-base flex-shrink-0`}>
            {character?.avatar ?? '🤖'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-gray-800 truncate">
              {character?.name ?? (zh ? '导师' : 'Tutor')}
            </div>
            <div className="text-xs text-gray-400 truncate">
              {character?.subjectLabel ?? session.title}
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-300 flex-shrink-0">
          {session.title}
        </div>
      </div>

      {/* ── Message list ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {/* Start marker */}
        {messages.length === 0 && !isLoading && (
          <div className="flex justify-center my-8">
            <div className="bg-white/90 border border-pink-200 rounded-2xl px-6 py-4 shadow-sm text-center max-w-sm">
              <div className="text-2xl mb-2">{character?.avatar ?? '📖'}</div>
              <div className="text-sm font-bold text-pink-700">
                {zh ? `${character?.name ?? '导师'}正在准备...` : `${character?.name ?? 'Tutor'} is preparing...`}
              </div>
              <div className="text-xs text-gray-400 mt-1">{session.title}</div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => renderMessage(msg, idx))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start mb-4">
            <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-lg flex-shrink-0 mr-2.5 mt-1`}>
              {character?.avatar ?? '🤖'}
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1 font-semibold ml-1">
                {character?.name ?? 'Tutor'}
              </div>
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

        {/* Error */}
        {error && (
          <div className="flex justify-center my-2">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-600">
              <i className="fas fa-exclamation-circle mr-1" /> {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 underline hover:no-underline"
              >
                {zh ? '关闭' : 'Dismiss'}
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 bg-white/95 backdrop-blur border-t border-gray-200 p-3 z-10">
        <div className="flex gap-2 items-end max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={zh ? '输入你的问题或回答...' : 'Ask a question or respond...'}
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
        {isTyping && (
          <div className="text-center text-xs text-gray-400 mt-1">
            {zh ? '点击消息可跳过打字动画' : 'Tap message to skip typing animation'}
          </div>
        )}
      </div>
    </div>
  );
};
