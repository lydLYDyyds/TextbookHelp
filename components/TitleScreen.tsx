import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
  onDirectStart: () => void;
  onHistory: () => void;
  hasSavedSession: boolean;
  onResources: () => void;
  onSettings: () => void;
  language: 'zh' | 'en';
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onDirectStart, onHistory, hasSavedSession, onResources, onSettings, language }) => {
  const zh = language === 'zh';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative px-6">
      <div className="z-10 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(255,105,180,0.8)] tracking-wider -rotate-2 mb-4 font-sans italic">
          <span className="text-gal-pink-dark">Textbook</span>
          <span className="text-gal-blue mx-2">2</span>
          <span className="text-gal-pink-dark">Galgame</span>
        </h1>

        <div className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-gal-pink mb-12 shadow-lg animate-bounce-slow">
          <span className="text-gal-pink-dark font-bold tracking-widest uppercase">
            <i className="fas fa-graduation-cap mr-2"></i> Socratic + Feynman Study Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-5 md:gap-5">
          <MenuButton onClick={onStart} icon="fa-file-pdf" label={zh ? '导入 PDF' : 'Import PDF'} subLabel="UPLOAD" primary />
          <MenuButton onClick={onDirectStart} icon="fa-comments" label={zh ? '直接开始' : 'Direct'} subLabel="NO PDF" />
          <MenuButton
            onClick={onHistory}
            icon="fa-history"
            label={zh ? '学习记录' : 'History'}
            subLabel={hasSavedSession ? 'SAVED' : 'EMPTY'}
            disabled={false}
          />
          <MenuButton onClick={onResources} icon="fa-book-atlas" label={zh ? '高阶资源' : 'Resources'} subLabel="ROADMAP" />
          <MenuButton onClick={onSettings} icon="fa-cog" label={zh ? '学习设置' : 'Settings'} subLabel="CONFIG" />
        </div>
      </div>

      <div className="absolute bottom-4 text-gal-pink-dark/70 text-xs">
        Powered by Gemini / DeepSeek — Diagnostic Teaching Engine
      </div>
    </div>
  );
};

const MenuButton: React.FC<{ onClick: () => void; icon: string; label: string; subLabel: string; primary?: boolean; disabled?: boolean }> = ({ onClick, icon, label, subLabel, primary, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      group relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1
      w-40 h-24 skew-x-[-10deg] rounded-lg shadow-lg flex items-center justify-center
      ${disabled
        ? 'bg-gray-100 text-gray-400 border-2 border-gray-100 cursor-not-allowed shadow-none hover:translate-y-0'
        : primary
        ? 'bg-gradient-to-r from-gal-blue to-purple-500 text-white'
        : 'bg-white text-gray-700 border-2 border-gray-100 hover:border-gal-pink'
      }
    `}
  >
    <div className="skew-x-[10deg] flex flex-col items-center">
      <i className={`fas ${icon} text-xl mb-1`}></i>
      <div className="text-lg font-bold mb-0.5">{label}</div>
      <div className={`text-xs tracking-widest font-sans ${primary ? 'text-blue-100' : 'text-gray-400'}`}>{subLabel}</div>
    </div>
  </button>
);
