import React from 'react';

interface TitleScreenProps {
  onStart: () => void;
  onResume: () => void;
  hasSavedSession: boolean;
  onResources: () => void;
  onSettings: () => void;
  language: 'zh' | 'en';
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, onResume, hasSavedSession, onResources, onSettings, language }) => {
  const zh = language === 'zh';
  const t = {
    badge: 'Advanced Socratic Study Room',
    study: zh ? '\u5f00\u59cb\u5b66\u4e60' : 'Study',
    resume: zh ? '继续学习' : 'Resume',
    resources: zh ? '\u9ad8\u9636\u8d44\u6e90' : 'Resources',
    settings: zh ? '\u5b66\u4e60\u8bbe\u7f6e' : 'Settings',
    footer: 'Powered by Gemini / DeepSeek - Designed for advanced textbook learning',
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full relative px-6">
      <div className="absolute right-0 bottom-0 h-[90%] w-[42vw] z-0 opacity-0 animate-fade-in transition-opacity duration-1000 delay-500 hidden md:block overflow-hidden">
        <img
          src="/characters/abo/normal.png"
          alt="Abo"
          className="h-full w-full object-cover object-[50%_35%] opacity-95"
          style={{ maskImage: 'linear-gradient(to bottom, black 78%, transparent 100%)' }}
        />
      </div>

      <div className="z-10 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-8xl font-black text-white drop-shadow-[0_5px_5px_rgba(255,105,180,0.8)] tracking-wider -rotate-2 mb-4 font-sans italic">
          <span className="text-gal-pink-dark">Textbook</span>
          <span className="text-gal-blue mx-2">2</span>
          <span className="text-gal-pink-dark">Galgame</span>
        </h1>

        <div className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-gal-pink mb-12 shadow-lg animate-bounce-slow">
          <span className="text-gal-pink-dark font-bold tracking-widest uppercase">
            <i className="fas fa-graduation-cap mr-2"></i> {t.badge}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-7">
          <MenuButton onClick={onStart} icon="fa-play" label={t.study} subLabel="IMPORT PDF" primary />
          <MenuButton onClick={onResume} icon="fa-bookmark" label={t.resume} subLabel="SAVED" disabled={!hasSavedSession} />
          <MenuButton onClick={onResources} icon="fa-book-atlas" label={t.resources} subLabel="ROADMAP" />
          <MenuButton onClick={onSettings} icon="fa-cog" label={t.settings} subLabel="CONFIG" />
        </div>
      </div>

      <div className="absolute bottom-4 text-gal-pink-dark/70 text-xs">
        {t.footer}
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
      w-48 h-24 skew-x-[-10deg] rounded-lg shadow-lg flex items-center justify-center
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
      <div className="text-2xl font-bold mb-1">{label}</div>
      <div className={`text-xs tracking-widest font-sans ${primary ? 'text-blue-100' : 'text-gray-400'}`}>{subLabel}</div>
    </div>

    <div className="absolute top-0 -left-full w-1/2 h-full bg-white/20 skew-x-[20deg] group-hover:animate-[shine_1s_infinite]"></div>
  </button>
);
