import React, { useState } from 'react';
import { GameSettings } from '../types';
import { builtinCharacters } from '../data/characters';

interface SettingsScreenProps {
  currentSettings: GameSettings;
  onSave: (settings: GameSettings) => void;
  onBack: () => void;
  onPersonalityDistill: () => void;
  language: 'zh' | 'en';
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ currentSettings, onSave, onBack, onPersonalityDistill, language }) => {
  const [settings, setSettings] = useState<GameSettings>(currentSettings);
  const zh = language === 'zh';

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white/60 backdrop-blur-md p-8 relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gal-pink/10 -z-10"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-4xl w-full border-2 border-gal-pink max-h-[92vh] overflow-y-auto">
        <h2 className="text-3xl font-bold text-center text-gal-pink-dark mb-8 flex items-center justify-center gap-3">
          <i className="fas fa-cog animate-spin-slow"></i>
          {zh ? '学习设置' : 'Study Settings'}
        </h2>

        <div className="space-y-8">
          <SettingGroup title={zh ? '界面与对话语言' : 'UI and Dialogue Language'} icon="fa-language">
            <SettingOption
              label={zh ? '中文界面' : 'Chinese UI'}
              desc={zh ? '固定界面显示中文' : 'Show app UI in Chinese'}
              selected={settings.uiLanguage === 'zh'}
              onClick={() => setSettings({ ...settings, uiLanguage: 'zh' })}
            />
            <SettingOption
              label={zh ? '英文界面' : 'English UI'}
              desc={zh ? '固定界面显示英文' : 'Show app UI in English'}
              selected={settings.uiLanguage === 'en'}
              onClick={() => setSettings({ ...settings, uiLanguage: 'en' })}
            />
            <SettingOption
              label={zh ? '中文对话' : 'Chinese Dialogue'}
              desc={zh ? '导师讲解用中文，英文标题保留英文' : 'Tutor explains in Chinese'}
              selected={settings.dialogueLanguage === 'zh'}
              onClick={() => setSettings({ ...settings, dialogueLanguage: 'zh' })}
            />
          </SettingGroup>

          <SettingGroup title={zh ? 'AI 模型' : 'AI Provider'} icon="fa-robot">
            <SettingOption
              label="Gemini"
              desc={zh ? '可直接读取 PDF，但需要能访问 Google API' : 'Reads PDF directly, requires Google API access'}
              selected={settings.aiProvider === 'gemini'}
              onClick={() => setSettings({ ...settings, aiProvider: 'gemini' })}
            />
            <SettingOption
              label="DeepSeek V4 Pro"
              desc={zh ? '先抽取 PDF 文本，再走本地代理调用 DeepSeek' : 'Extracts PDF text, then uses local proxy'}
              selected={settings.aiProvider === 'deepseek'}
              onClick={() => setSettings({ ...settings, aiProvider: 'deepseek' })}
            />
            <SettingOption
              label={zh ? '英文对话' : 'English Dialogue'}
              desc={zh ? '导师讲解用英文' : 'Tutor explains in English'}
              selected={settings.dialogueLanguage === 'en'}
              onClick={() => setSettings({ ...settings, dialogueLanguage: 'en' })}
            />
          </SettingGroup>

          <SettingGroup title={zh ? '选择导师' : 'Choose Tutor'} icon="fa-user-graduate">
            <div className="col-span-3 space-y-3">
              {builtinCharacters.map(char => {
                const isSelected = (settings.activeCharacterId ?? 'prof-lin') === char.id;
                const borderColorMap: Record<string, string> = {
                  blue: 'border-blue-400 bg-blue-50',
                  emerald: 'border-emerald-400 bg-emerald-50',
                  purple: 'border-purple-400 bg-purple-50',
                  amber: 'border-amber-400 bg-amber-50',
                  orange: 'border-orange-400 bg-orange-50',
                  rose: 'border-rose-400 bg-rose-50',
                  indigo: 'border-indigo-400 bg-indigo-50',
                };
                const borderClass = isSelected
                  ? (borderColorMap[char.color] ?? 'border-pink-400 bg-pink-50') + ' shadow-md scale-[1.02]'
                  : 'border-gray-200 hover:border-gray-300';

                return (
                  <button
                    key={char.id}
                    onClick={() => setSettings({ ...settings, activeCharacterId: char.id })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${borderClass}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{char.avatar}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-800">
                          {char.name}
                          <span className="ml-2 text-xs font-normal text-gray-400">{char.subjectLabel}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{char.speakingStyle}</div>
                      </div>
                      {isSelected && (
                        <i className="fas fa-check-circle text-green-500 text-xl flex-shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
              <div className="text-xs text-gray-400 italic mt-1">
                {zh
                  ? '选择不同导师后，AI 会以该角色的人设和教学风格与你对话。可在上传 PDF 前随时切换。'
                  : 'Each tutor has a unique persona and teaching style. Switch anytime before uploading a PDF.'}
              </div>
            </div>
          </SettingGroup>

          <SettingGroup title={zh ? '讲解深度' : 'Depth'} icon="fa-book-reader">
            <SettingOption
              label={zh ? '快速' : 'Brief'}
              desc={zh ? '核心思想，约 15 轮' : 'Core idea, about 15 turns'}
              selected={settings.detailLevel === 'brief'}
              onClick={() => setSettings({ ...settings, detailLevel: 'brief' })}
            />
            <SettingOption
              label={zh ? '标准' : 'Standard'}
              desc={zh ? '概念、例子和检查' : 'Concepts, examples, checks'}
              selected={settings.detailLevel === 'detailed'}
              onClick={() => setSettings({ ...settings, detailLevel: 'detailed' })}
            />
            <SettingOption
              label={zh ? '深入' : 'Deep'}
              desc={zh ? '推导、误区和衔接' : 'Derivations and bridges'}
              selected={settings.detailLevel === 'academic'}
              onClick={() => setSettings({ ...settings, detailLevel: 'academic' })}
            />
          </SettingGroup>

          <SettingGroup title={zh ? '学习方式' : 'Learning Mode'} icon="fa-comments">
            <SettingOption
              label={zh ? '引导' : 'Guided'}
              desc={zh ? '先讲解，再检查' : 'Explain first, then check'}
              selected={settings.learningMode === 'guided'}
              onClick={() => setSettings({ ...settings, learningMode: 'guided' })}
            />
            <SettingOption
              label={zh ? '苏格拉底' : 'Socratic'}
              desc={zh ? '通过提问建构概念' : 'Build concepts by questions'}
              selected={settings.learningMode === 'socratic'}
              onClick={() => setSettings({ ...settings, learningMode: 'socratic' })}
            />
            <SettingOption
              label={zh ? '费曼' : 'Feynman'}
              desc={zh ? '用自己的话解释' : 'Explain it in your own words'}
              selected={settings.learningMode === 'feynman'}
              onClick={() => setSettings({ ...settings, learningMode: 'feynman' })}
            />
          </SettingGroup>

          <SettingGroup title={zh ? '个性蒸馏' : 'Personality Distill'} icon="fa-flask">
            <div className="col-span-3">
              <button
                onClick={onPersonalityDistill}
                className="w-full p-4 rounded-xl border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-purple-700 text-lg">
                      <i className="fas fa-flask mr-2" />
                      {zh ? '蒸馏我的聊天风格' : 'Distill My Chat Style'}
                    </div>
                    <div className="text-sm text-purple-500 mt-1">
                      {zh
                        ? '上传微信聊天记录，让 AI 导师用你的方式说话'
                        : 'Upload WeChat history to make the AI tutor speak like you'}
                    </div>
                  </div>
                  <div className="text-purple-400">
                    {currentSettings.useDistilledPersonality && currentSettings.personalityProfile?.createdAt ? (
                      <span className="text-green-500 font-bold text-sm">
                        <i className="fas fa-check-circle mr-1" />
                        {zh ? '已启用' : 'Active'}
                      </span>
                    ) : (
                      <i className="fas fa-chevron-right text-xl" />
                    )}
                  </div>
                </div>
              </button>
            </div>
          </SettingGroup>

          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 mt-4 border border-gray-200 leading-relaxed">
            <i className="fas fa-info-circle mr-1"></i>
            {zh
              ? 'Gemini 使用 GEMINI_API_KEY。DeepSeek 使用 DEEPSEEK_API_KEY，并通过本地 Vite 代理调用，避免浏览器 CORS 和 key 暴露。'
              : 'Gemini uses GEMINI_API_KEY. DeepSeek uses DEEPSEEK_API_KEY through the local Vite proxy to avoid browser CORS and key exposure.'}
          </div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-gray-100">
          <button
            onClick={onBack}
            className="px-6 py-2 rounded-full font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            {zh ? '取消' : 'Cancel'}
          </button>
          <button
            onClick={() => onSave(settings)}
            className="px-8 py-2 rounded-full font-bold bg-gal-pink text-white hover:bg-gal-pink-dark shadow-md transform hover:scale-105 transition-all"
          >
            {zh ? '保存' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SettingGroup: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div>
    <h3 className="text-xl font-bold text-gray-700 mb-4 border-b-2 border-gray-100 pb-2">
      <i className={`fas ${icon} text-gal-blue mr-2`}></i>
      {title}
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>
  </div>
);

const SettingOption: React.FC<{ label: string; desc: string; selected: boolean; onClick: () => void }> = ({ label, desc, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`
      flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 min-h-24
      ${selected
        ? 'border-gal-pink bg-pink-50 text-gal-pink-dark shadow-md scale-105'
        : 'border-gray-200 hover:border-gal-pink/50 hover:bg-white text-gray-600'
      }
    `}
  >
    <div className="font-bold text-lg mb-1">{label}</div>
    <div className="text-xs opacity-80 leading-relaxed">{desc}</div>
  </button>
);
