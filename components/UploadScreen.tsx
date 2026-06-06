/**
 * UploadScreen.tsx — Session creation (PDF optional)
 *
 * Users can either upload a PDF or start learning directly.
 * If no PDF, the character teaches from their own subject knowledge.
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
  /** If true, skip PDF upload and create a session immediately */
  skipPDF?: boolean;
}

export const UploadScreen: React.FC<Props> = ({ onSessionCreated, onBack, settings, skipPDF }) => {
  const zh = settings.uiLanguage === 'zh';
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState('');

  const activeCharId = settings.activeCharacterId ?? 'prof-lin';
  const character = getBuiltinCharacter(activeCharId);

  // Start without PDF
  const startWithoutPDF = useCallback(() => {
    const now = Date.now();
    const sourceKey = `direct-${activeCharId}-${now}`;

    const session = createChatSession({
      sourceKey,
      characterId: activeCharId,
      title: character?.subjectLabel ?? (zh ? '自由学习' : 'Free Study'),
      pdfText: undefined,
    });

    upsertChatSession(session);
    onSessionCreated(session);
  }, [activeCharId, character, zh, onSessionCreated]);

  // If skipPDF mode, start immediately
  React.useEffect(() => {
    if (skipPDF) startWithoutPDF();
  }, []);

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
      onSessionCreated(cached);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLoadingText(zh ? '正在读取 PDF...' : 'Reading PDF...');

    try {
      const pageCount = await getPdfPageCount(file);
      setLoadingText(zh ? `正在提取文本（共 ${pageCount} 页）...` : `Extracting text (${pageCount} pages)...`);

      const pdfText = await extractTextFromPdf(file, {
        onProgress: setLoadingText,
        ocrLanguage: settings.dialogueLanguage === 'zh' ? 'chi_sim+eng' : 'eng',
        maxOcrPages: 30,
        maxChars: CHAT_PDF_CHAR_LIMIT * 2,
      });

      if (!pdfText.trim()) {
        throw new Error(zh ? '未能从 PDF 中提取到文本。' : 'Could not extract text from PDF.');
      }

      setLoadingText(zh ? '正在创建学习会话...' : 'Creating study session...');

      const session = createChatSession({
        sourceKey,
        characterId: activeCharId,
        title: file.name.replace(/\.pdf$/i, ''),
        pdfText: pdfText.slice(0, CHAT_PDF_CHAR_LIMIT),
      });

      upsertChatSession(session);
      onSessionCreated(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('PDF processing failed:', err);
      setError(message);
      setIsProcessing(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) processFile(e.dataTransfer.files[0]);
  }, [settings, activeCharId]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) processFile(e.target.files[0]);
  };

  if (skipPDF) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-white/50 backdrop-blur-md p-8">
        <div className="flex flex-col items-center gap-4 py-12 bg-white rounded-3xl shadow-xl border-4 border-gal-pink/30 px-6">
          <div className="w-16 h-16 border-4 border-gal-pink border-t-transparent rounded-full animate-spin" />
          <p className="text-xl text-gal-pink-dark font-serif animate-pulse text-center">
            {zh ? '正在进入学习房间...' : 'Entering the study room...'}
          </p>
        </div>
      </div>
    );
  }

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
          {zh ? '开始学习' : 'Start Learning'}
        </h2>
        <p className="text-center text-gray-500 mb-6">
          {zh
            ? `导师：${character?.name ?? '未选择'} · ${settings.aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}`
            : `Tutor: ${character?.name ?? 'None'} · ${settings.aiProvider === 'deepseek' ? 'DeepSeek' : 'Gemini'}`
          }
        </p>

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white rounded-3xl shadow-xl border-4 border-gal-pink/30">
            <div className="w-16 h-16 border-4 border-gal-pink border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-xl text-gal-pink-dark font-serif animate-pulse text-center px-6">{loadingText}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PDF upload area */}
            <div
              className={`
                relative group cursor-pointer
                flex flex-col items-center justify-center p-10
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
              <div className="w-16 h-16 bg-gal-pink/10 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <i className="fas fa-book-open text-2xl text-gal-pink-dark" />
              </div>
              <p className="text-lg font-bold text-gray-700 mb-1">
                {zh ? '上传 PDF 教材' : 'Upload PDF Textbook'}
              </p>
              <p className="text-sm text-gray-400">
                {zh ? '拖拽或点击选择文件' : 'Drag or click to select'}
              </p>
            </div>

            {/* Direct entry */}
            <button
              onClick={startWithoutPDF}
              className="w-full p-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gal-blue hover:bg-blue-50 transition-all duration-200 text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-comments text-lg text-blue-500" />
              </div>
              <div>
                <div className="font-bold text-gray-700">
                  {zh ? '无需 PDF，直接开始对话' : 'Start Without PDF'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {zh
                    ? `${character?.name ?? '导师'}将基于自身知识自由教学`
                    : `${character?.name ?? 'Tutor'} will teach from their own knowledge`}
                </div>
              </div>
              <i className="fas fa-chevron-right text-gray-300 ml-auto" />
            </button>

            {error && (
              <div className="p-3 bg-red-100 text-red-600 rounded-lg text-sm font-bold flex items-center">
                <i className="fas fa-exclamation-circle mr-2" /> {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
