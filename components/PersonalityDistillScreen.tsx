import React, { useState, useCallback } from 'react';
import { GameSettings, PersonalityProfile } from '../types';
import { parseChatFile, distillPersonality } from '../services/personalityService';

interface PersonalityDistillScreenProps {
  settings: GameSettings;
  onSave: (profile: PersonalityProfile) => void;
  onBack: () => void;
  language: 'zh' | 'en';
}

export const PersonalityDistillScreen: React.FC<PersonalityDistillScreenProps> = ({
  settings, onSave, onBack, language,
}) => {
  const zh = language === 'zh';
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PersonalityProfile | null>(
    settings.personalityProfile || null,
  );
  const [showGuide, setShowGuide] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith('.txt') || f.name.endsWith('.csv'))) {
      setFile(f);
      setError(null);
    } else {
      setError(zh ? '请上传 TXT 或 CSV 格式的聊天记录文件。' : 'Please upload a TXT or CSV chat export file.');
    }
  }, [zh]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  };

  const handleDistill = async () => {
    if (!file) return;
    setIsProcessing(true);
    setError(null);

    try {
      const chatText = await parseChatFile(file);
      if (chatText.length < 100) {
        throw new Error(zh
          ? '未能从文件中提取到足够的聊天消息。请确认文件是 WeChatMsg 导出的 TXT/CSV 格式。'
          : 'Could not extract enough messages. Make sure the file is a WeChatMsg TXT/CSV export.');
      }
      const result = await distillPersonality(chatText, settings);
      result.sourceDesc = file.name;
      setProfile(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      console.error('Distillation failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (profile) onSave(profile);
  };

  const handleRemove = () => {
    setProfile(null);
    setFile(null);
    // Save empty profile to clear it
    const emptyProfile: PersonalityProfile = {
      createdAt: 0,
      sourceDesc: '',
      speakingStyle: '',
      commonPhrases: [],
      emojiStyle: '',
      questionStyle: '',
      sentenceLength: '',
      formalityLevel: '',
      codeSwitching: '',
      rawSummary: '',
    };
    onSave(emptyProfile);
  };

  const hasAppliedProfile = settings.useDistilledPersonality && settings.personalityProfile?.createdAt;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white/60 backdrop-blur-md p-4 md:p-8">
      <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-2xl w-full border-2 border-purple-200 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <i className="fas fa-arrow-left text-lg" />
          </button>
          <h2 className="text-2xl font-bold text-purple-700">
            <i className="fas fa-flask mr-2" />
            {zh ? '个性蒸馏' : 'Personality Distillation'}
          </h2>
        </div>

        {/* Step 1: Export guide */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center">1</span>
            <span className="font-bold text-gray-700">
              {zh ? '导出微信聊天记录' : 'Export WeChat Chat History'}
            </span>
          </div>
          <div className="ml-9 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-2 mb-2">
              <i className="fas fa-tools text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold text-amber-800">
                  {zh ? '推荐使用 WeChatMsg 工具导出' : 'Recommended: WeChatMsg tool'}
                </span>
                <button
                  onClick={() => setShowGuide(!showGuide)}
                  className="ml-2 text-xs text-purple-500 underline hover:text-purple-700"
                >
                  {showGuide ? (zh ? '收起' : 'Collapse') : (zh ? '查看步骤' : 'View Steps')}
                </button>
              </div>
            </div>
            {showGuide && (
              <ol className="list-decimal list-inside space-y-1 text-gray-600 ml-2">
                <li>{zh ? '下载工具' : 'Download tool'}: <a href="https://github.com/xxxxshuai/WeChatMsg.git" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">github.com/xxxxshuai/WeChatMsg</a></li>
                <li>{zh ? '打开工具 → 选择微信数据目录' : 'Open tool → Select WeChat data directory'}</li>
                <li>{zh ? '选择你要蒸馏的联系人（自己的聊天记录）' : 'Select the contact whose chat you want to distill'}</li>
                <li>{zh ? '导出为 TXT 或 CSV 格式' : 'Export as TXT or CSV format'}</li>
                <li>{zh ? '如果你没有特定联系人，可以导出"文件传输助手"或自己的笔记' : 'Tip: export your own messages or notes for self-distillation'}</li>
              </ol>
            )}
          </div>
        </div>

        {/* Step 2: Upload */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center">2</span>
            <span className="font-bold text-gray-700">{zh ? '上传聊天记录文件' : 'Upload Chat File'}</span>
          </div>
          <div
            className={`
              ml-9 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${file
                ? 'border-purple-400 bg-purple-50'
                : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50/50'
              }
            `}
            onDragOver={(e) => { e.preventDefault(); }}
            onDragLeave={() => {}}
            onDrop={handleFileDrop}
            onClick={() => document.getElementById('chatFileInput')?.click()}
          >
            <input
              type="file"
              id="chatFileInput"
              className="hidden"
              accept=".txt,.csv"
              onChange={handleFileSelect}
            />
            {file ? (
              <div className="text-purple-700">
                <i className="fas fa-file-alt text-3xl mb-2 block" />
                <span className="font-bold">{file.name}</span>
                <div className="text-xs text-purple-400 mt-1">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div className="text-gray-400">
                <i className="fas fa-cloud-upload-alt text-3xl mb-2 block" />
                <span className="font-bold">{zh ? '点击或拖拽 TXT/CSV 文件到此处' : 'Click or drag TXT/CSV file here'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Distill */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center">3</span>
            <span className="font-bold text-gray-700">{zh ? '开始蒸馏' : 'Start Distillation'}</span>
          </div>
          <div className="ml-9">
            <button
              onClick={handleDistill}
              disabled={!file || isProcessing}
              className="w-full py-3 rounded-xl font-bold text-white bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500 transition-colors shadow-md"
            >
              {isProcessing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {zh ? '正在分析语言风格...' : 'Analyzing communication style...'}
                </span>
              ) : (
                <span>
                  <i className="fas fa-magic mr-2" />
                  {zh ? '分析我的语言风格' : 'Analyze My Communication Style'}
                </span>
              )}
            </button>
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-semibold">
                <i className="fas fa-exclamation-circle mr-1" /> {error}
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Result */}
        {profile && profile.createdAt > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-full bg-purple-500 text-white text-sm font-bold flex items-center justify-center">4</span>
              <span className="font-bold text-gray-700">{zh ? '蒸馏结果' : 'Distillation Result'}</span>
            </div>
            <div className="ml-9 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <ProfileItem icon="fa-comment" label={zh ? '说话风格' : 'Speaking Style'} value={profile.speakingStyle} />
                <ProfileItem icon="fa-font" label={zh ? '句子长度' : 'Sentence Length'} value={profile.sentenceLength} />
                <ProfileItem icon="fa-smile" label={zh ? '表情习惯' : 'Emoji Style'} value={profile.emojiStyle} />
                <ProfileItem icon="fa-question" label={zh ? '提问方式' : 'Question Style'} value={profile.questionStyle} />
                <ProfileItem icon="fa-balance-scale" label={zh ? '正式程度' : 'Formality'} value={profile.formalityLevel} />
                <ProfileItem icon="fa-language" label={zh ? '中英混用' : 'Code Switching'} value={profile.codeSwitching} />
              </div>
              {profile.commonPhrases.length > 0 && (
                <div className="pt-2 border-t border-purple-200">
                  <div className="font-bold text-gray-600 mb-1">
                    {zh ? '高频口头禅' : 'Common Phrases'}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {profile.commonPhrases.map((phrase, i) => (
                      <span key={i} className="bg-white rounded-full px-2.5 py-1 text-xs text-purple-700 border border-purple-200">
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-purple-200">
                <div className="font-bold text-gray-600 mb-1">{zh ? '完整画像' : 'Full Profile'}</div>
                <p className="text-gray-700 leading-relaxed">{profile.rawSummary}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleApply}
                  className="flex-1 py-2 rounded-full font-bold text-white bg-purple-500 hover:bg-purple-600 transition-colors text-sm"
                >
                  <i className="fas fa-check mr-1" />
                  {zh ? '应用此人格' : 'Apply This Profile'}
                </button>
                <button
                  onClick={handleDistill}
                  disabled={!file || isProcessing}
                  className="px-4 py-2 rounded-full font-bold text-purple-600 border border-purple-300 hover:bg-purple-50 transition-colors text-sm disabled:text-gray-300 disabled:border-gray-200"
                >
                  <i className="fas fa-redo mr-1" />
                  {zh ? '重新蒸馏' : 'Re-distill'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applied status */}
        {hasAppliedProfile && (
          <div className="flex items-center justify-between ml-9 p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 text-green-700 text-sm font-bold">
              <i className="fas fa-check-circle text-lg" />
              {zh ? '蒸馏人格已启用' : 'Distilled personality is active'}
            </div>
            <button
              onClick={handleRemove}
              className="text-xs text-red-400 hover:text-red-600 underline"
            >
              {zh ? '移除' : 'Remove'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ProfileItem: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div>
    <div className="text-gray-400 text-xs mb-0.5">
      <i className={`fas ${icon} mr-1`} />{label}
    </div>
    <div className="text-gray-700 font-semibold">{value || '-'}</div>
  </div>
);
