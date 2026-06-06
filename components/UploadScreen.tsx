/**
 * UploadScreen.tsx — PDF import and session creation
 *
 * User drags/drops or selects a PDF. The app extracts text,
 * creates a ChatSession, and navigates to the chat interface.
 */
import React, { useState, useCallback } from 'react';
import { ChatSession, GameSettings } from '../types';
import { extractTextFromPdf, getPdfPageCount } from '../services/pdfTextService';
import { findChatSessionBySource, getFileSourceKey, createChatSession, upsertChatSession } from '../services/localStorageService';
import { getBuiltinCharacter } from '../data/characters';
import { CHAT_PDF_CHAR_LIMIT } from '../constants';

interface Props {
  onSessionCreated: (session: ChatSession) => void;
  onBack: () => void;
  settings: GameSettings;
}

export const UploadScreen: React.FC<Props> = ({ onSessionCreated, onBack, settings }) => {
  const zh = settings.uiLanguage === 'zh';
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(zh ? '正在准备...' : 'Preparing...');

  const activeCharId = settings.activeCharacterId ?? 'prof-lin';
  const character = getBuiltinCharacter(activeCharId);

  const processFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError(zh ? '请上传 PDF 教材或讲义。' : 'Please upload a PDF textbook or lecture note.');
      return;
    }

    const MAX_SIZE_MB = 200;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(zh ? `PDF 文件过大（超过 ${MAX_SIZE_MB}MB）。` : `PDF too large (over ${MAX_SIZE_MB}MB).`);
      return;
    }

    const sourceKey = getFileSourceKey(file);
    const cached = findChatSessionBySource(sourceKey);
    if (cached) {
      setLoadingText(zh ? '已找到本地学习记录，正在打开...' : 'Found saved session. Opening...');
      onSessionCreated(cached);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLoadingText(zh ? '正在读取 PDF...' : 'Reading PDF...');

    try {
      const pageCount = await getPdfPageCount(file);

      setLoadingText(zh
        ? `正在提取文本（共 ${pageCount} 页）...`
        : `Extracting text (${pageCount} pages)...`);

      const pdfText = await extractTextFromPdf(file, {
        onProgress: setLoadingText,
        ocrLanguage: settings.dialogueLanguage === 'zh' ? 'chi_sim+eng' : 'eng',
        maxOcrPages: 30,
        maxChars: CHAT_PDF_CHAR_LIMIT * 2, // Extract more, truncate in prompt
      });

      if (!pdfText.trim()) {
        throw new Error(zh ? '未能从 PDF 中提取到文本。' : 'Could not extract text from PDF.');
      }

      setLoadingText(zh ? '正在创建学习会话...' : 'Creating study session...');

      const title = file.name.replace(/\.pdf$/i, '');

      const session = createChatSession({
        sourceKey,
        characterId: activeCharId,
        title,
        pdfText: pdfText.slice(0, CHAT_PDF_CHAR_LIMIT),
      });

      upsertChatSession(session);
      onSessionCreated(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isNetworkError = message.includes('fetch failed') || message.includes('Failed to fetch');

      if (isNetworkError) {
        setError(zh ? '无法连接网络。请检查代理/VPN。' : 'Network error. Check VPN/proxy.');
      } else {
        console.error('PDF processing failed:', err);
        setError(message);
      }
      setIsProcessing(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]);
  }, [settings]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFile(e.target.files[0]);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-white/50 backdrop-blur-md p-8">
      <button
        onClick={onBack}
        className="absolute top-8 left-8 text-gal-pink-dark hover:text-gal-pink font-bold flex items-center gap-2 transition-colors"
      >
        <i className="fas fa-arrow-left" /> {zh ? '返回' : 'Back'}
      </button>

      <div className="max-w-xl w-full">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          {zh ? '导入教材' : 'Import Textbook'}
        </h2>
        <p className="text-center text-gray-500 mb-3">
          {zh
            ? `当前导师：${character?.name ?? '未选择'} · ${settings.aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}`
            : `Tutor: ${character?.name ?? 'None'} · ${settings.aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}`
          }
        </p>
        <p className="text-center text-gray-400 text-xs mb-8">
          {zh
            ? `上传合法 PDF 教材、讲义或课程章节。导师将基于 ${character?.subjectLabel ?? '教材内容'} 与你进行实时学习对话。`
            : `Upload a legal PDF. Your tutor will chat with you in real time about ${character?.subjectLabel ?? 'the material'}.`
          }
        </p>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl shadow-xl border-4 border-gal-pink/30">
            <div className="w-16 h-16 border-4 border-gal-pink border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xl text-gal-pink-dark font-serif animate-pulse text-center px-6">{loadingText}</p>
            <p className="text-sm text-gray-400 mt-2">{zh ? '长教材可能需要更久。' : 'Long PDFs take more time.'}</p>
          </div>
        ) : (
          <div
            className={`
              relative group cursor-pointer
              flex flex-col items-center justify-center p-12
              border-4 border-dashed rounded-3xl transition-all duration-300
              ${isDragging
                ? 'border-gal-blue bg-blue-50 scale-105'
                : 'border-gal-pink/50 bg-white hover:border-gal-pink hover:shadow-xl'
              }
            `}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <input type="file" id="fileInput" className="hidden" accept=".pdf" onChange={onFileSelect} />
            <div className="w-20 h-20 bg-gal-pink/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-book-open text-3xl text-gal-pink-dark" />
            </div>
            <p className="text-xl font-bold text-gray-700 mb-2">
              {zh ? '点击或拖拽 PDF 到这里' : 'Click or drag PDF here'}
            </p>
            <p className="text-sm text-gray-400">
              {zh ? '适合高阶数学与理论物理讲义' : 'Best for advanced math and theoretical physics'}
            </p>
            {error && (
              <div className="mt-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm font-bold flex items-center animate-bounce">
                <i className="fas fa-exclamation-circle mr-2" /> {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
