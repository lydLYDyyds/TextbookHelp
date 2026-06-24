/**
 * LearningHistoryScreen.tsx — Browse and manage past study sessions
 *
 * Shows a scrollable list of all ChatSessions with:
 *   - Character avatar, name, subject
 *   - PDF title or "free study" indicator
 *   - Concept mastery progress bars (from StudentModel)
 *   - Weak area warnings
 *   - Message count, last-study time
 *   - Resume and delete actions
 */
import React, { useState, useEffect } from 'react';
import { ChatSession, GameSettings } from '../types';
import { loadChatSessions, deleteChatSession as removeSession, upsertChatSession } from '../services/localStorageService';
import { getCharacterById } from '../data/characters';

interface Props {
  onResume: (session: ChatSession) => void;
  onBack: () => void;
  settings: GameSettings;
  language: 'zh' | 'en';
}

const MAX_BAR_WIDTH = 120;

const formatTime = (ts: number, zh: boolean) => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return zh ? `${date} ${time}` : `${date} ${time}`;
};

export const LearningHistoryScreen: React.FC<Props> = ({ onResume, onBack, settings, language }) => {
  const zh = language === 'zh';
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadChatSessions();
    // Fix: ensure every session has a studentModel (old sessions may not)
    setSessions(loaded);
  }, []);

  const handleDelete = (id: string) => {
    if (confirmDelete === id) {
      removeSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const handleResume = (session: ChatSession) => {
    // Update timestamp and push to top
    const updated = { ...session, updatedAt: Date.now() };
    upsertChatSession(updated);
    onResume(updated);
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white/60 backdrop-blur-md p-8">
        <button onClick={onBack} className="absolute top-8 left-8 text-gal-pink-dark hover:text-gal-pink font-bold flex items-center gap-2 transition-colors">
          <i className="fas fa-arrow-left" /> {zh ? '返回' : 'Back'}
        </button>
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 opacity-30">📚</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            {zh ? '还没有学习记录' : 'No Study History Yet'}
          </h2>
          <p className="text-gray-400 mb-6">
            {zh
              ? '开始你的第一次学习对话吧！选择一位导师，导入 PDF 或直接开始聊天。'
              : 'Start your first learning session! Pick a tutor, upload a PDF or chat directly.'}
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-gal-pink text-white rounded-full font-bold hover:bg-gal-pink-dark transition-colors shadow-md"
          >
            {zh ? '返回首页' : 'Back to Home'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-white/60 backdrop-blur-md overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 md:p-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={onBack} className="text-gal-pink-dark hover:text-gal-pink font-bold flex items-center gap-2 transition-colors mb-2">
              <i className="fas fa-arrow-left" /> {zh ? '返回' : 'Back'}
            </button>
            <h2 className="text-3xl font-black text-gray-800">
              <i className="fas fa-history mr-2 text-gal-pink-dark" />
              {zh ? '学习记录' : 'Study History'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {zh
                ? `${sessions.length} 个会话 · 点击继续回到任意对话`
                : `${sessions.length} sessions · Click to resume any conversation`}
            </p>
          </div>
        </div>

        {/* Session cards */}
        <div className="space-y-4">
          {sessions.map(session => {
            const char = getCharacterById(session.characterId, settings.customCharacters);
            const model = session.studentModel ?? { conceptMastery: {}, weakAreas: [], learningStyle: '', commonMistakes: [], recentDiagnoses: [], updatedAt: 0 };
            const concepts = Object.entries(model.conceptMastery ?? {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6);
            const msgCount = session.messages.length;
            const userMsgs = session.messages.filter(m => m.role === 'user').length;
            const hasPDF = !!session.pdfText;

            const barColor = (score: number) =>
              score >= 80 ? 'bg-emerald-400' :
              score >= 50 ? 'bg-amber-400' :
              'bg-red-400';

            const colorMap: Record<string, string> = {
              sky: 'border-l-sky-400', rose: 'border-l-rose-400',
              violet: 'border-l-violet-400', pink: 'border-l-pink-400',
              purple: 'border-l-purple-400', amber: 'border-l-amber-400',
              indigo: 'border-l-indigo-400',
            };
            const borderColor = colorMap[char?.color ?? 'pink'] ?? 'border-l-pink-400';

            return (
              <div
                key={session.id}
                className={`bg-white rounded-2xl shadow-md border-l-4 ${borderColor} p-5 transition-all hover:shadow-lg`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{char?.avatar ?? '🤖'}</span>
                    <div className="min-w-0">
                      <div className="font-bold text-gray-800 text-lg truncate">
                        {char?.name ?? (zh ? '未知导师' : 'Unknown')}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {char?.subjectLabel ?? ''}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0 ml-3 text-right">
                    {formatTime(session.updatedAt, zh)}
                  </div>
                </div>

                {/* Source info */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>
                    <i className={`fas ${hasPDF ? 'fa-file-pdf text-red-400' : 'fa-comments text-blue-400'} mr-1`} />
                    {hasPDF ? session.title : (zh ? '自由对话' : 'Free Chat')}
                  </span>
                  <span>
                    <i className="fas fa-comment-dots mr-1 text-gray-400" />
                    {zh ? `${msgCount} 条消息（你说了 ${userMsgs} 次）` : `${msgCount} msgs (${userMsgs} yours)`}
                  </span>
                  <span>
                    <i className="fas fa-lightbulb mr-1 text-amber-400" />
                    {concepts.length} {zh ? '个概念' : 'concepts'}
                  </span>
                </div>

                {/* Concept mastery bars */}
                {concepts.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    <div className="text-xs font-bold text-gray-500 mb-1">
                      {zh ? '概念掌握度' : 'Concept Mastery'}
                    </div>
                    {concepts.map(([name, score]) => (
                      <div key={name} className="flex items-center gap-2 text-xs">
                        <span className="w-20 text-gray-600 truncate text-right flex-shrink-0" title={name}>
                          {name}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden max-w-[120px]">
                          <div
                            className={`h-full rounded-full transition-all ${barColor(score)}`}
                            style={{ width: `${Math.min(100, Math.max(0, (score / 100) * MAX_BAR_WIDTH))}px` }}
                          />
                        </div>
                        <span className="w-8 text-gray-400 text-right flex-shrink-0">{score}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Weak areas */}
                {model.weakAreas.length > 0 && (
                  <div className="mb-3 flex items-start gap-2">
                    <span className="text-xs font-bold text-red-400 flex-shrink-0 mt-0.5">
                      <i className="fas fa-exclamation-triangle mr-1" />
                      {zh ? '薄弱' : 'Weak'}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {model.weakAreas.slice(0, 3).map((area, i) => (
                        <span key={i} className="text-xs bg-red-50 text-red-600 rounded-full px-2 py-0.5 border border-red-100 truncate max-w-[200px]" title={area}>
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleResume(session)}
                    className="px-5 py-2 bg-gal-pink text-white text-sm font-bold rounded-full hover:bg-gal-pink-dark transition-colors shadow-sm"
                  >
                    <i className="fas fa-play mr-1" />
                    {zh ? '继续学习' : 'Resume'}
                  </button>
                  <button
                    onClick={() => handleDelete(session.id)}
                    className={`px-4 py-2 text-sm font-bold rounded-full transition-colors ${
                      confirmDelete === session.id
                        ? 'bg-red-500 text-white'
                        : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    {confirmDelete === session.id ? (
                      <><i className="fas fa-check mr-1" />{zh ? '确认删除' : 'Confirm'}</>
                    ) : (
                      <i className="fas fa-trash" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
