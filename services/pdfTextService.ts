import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { createWorker } from 'tesseract.js';
import {
  TESSERACT_WORKER_PATH,
  TESSERACT_CORE_PATH,
  TESSERACT_LANG_PATH,
  OCR_RENDER_SCALE,
  MIN_SELECTABLE_TEXT_CHARS,
} from '../constants';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfExtractOptions {
  maxChars?: number;
  ocrLanguage?: string;
  maxOcrPages?: number;
  onProgress?: (message: string) => void;
}

export const getPdfPageCount = async (file: File): Promise<number> => {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  return pdf.numPages;
};

const renderPageToBlob = async (page: any, scale = OCR_RENDER_SCALE): Promise<Blob> => {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available for OCR rendering.');

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to render PDF page for OCR.'));
    }, 'image/png');
  });
};

const extractSelectableText = async (pdf: any, maxChars: number, onProgress?: (message: string) => void) => {
  const chunks: string[] = [];
  let totalLength = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    onProgress?.(`Reading selectable text: page ${pageNumber}/${pdf.numPages}`);
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      const chunk = `\n\n[Page ${pageNumber}]\n${pageText}`;
      chunks.push(chunk);
      totalLength += chunk.length;
    }

    if (totalLength >= maxChars) {
      chunks.push('\n\n[Truncated because the PDF text is long.]');
      break;
    }
  }

  return chunks.join('').slice(0, maxChars);
};

const extractOcrText = async (
  pdf: any,
  maxChars: number,
  language: string,
  maxPages: number,
  onProgress?: (message: string) => void,
) => {
  const pagesToRead = Math.min(pdf.numPages, maxPages);
  const worker = await createWorker(language, 1, {
    workerPath: TESSERACT_WORKER_PATH,
    corePath: TESSERACT_CORE_PATH,
    langPath: TESSERACT_LANG_PATH,
    gzip: false,
    logger: (message) => {
      if (message.status) {
        const pct = Number.isFinite(message.progress) ? ` ${Math.round(message.progress * 100)}%` : '';
        onProgress?.(`OCR ${message.status}${pct}`);
      }
    },
  });

  const chunks: string[] = [];
  let totalLength = 0;

  try {
    await worker.setParameters({
      preserve_interword_spaces: '1',
      user_defined_dpi: '220',
    });

    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber++) {
      onProgress?.(`OCR rendering page ${pageNumber}/${pagesToRead}`);
      const page = await pdf.getPage(pageNumber);
      const imageBlob = await renderPageToBlob(page, OCR_RENDER_SCALE);
      onProgress?.(`OCR recognizing page ${pageNumber}/${pagesToRead}`);
      const result = await worker.recognize(imageBlob);
      const pageText = result.data.text.replace(/\s+\n/g, '\n').trim();

      if (pageText) {
        const chunk = `\n\n[OCR Page ${pageNumber}]\n${pageText}`;
        chunks.push(chunk);
        totalLength += chunk.length;
      }

      if (totalLength >= maxChars) {
        chunks.push('\n\n[Truncated because OCR text is long.]');
        break;
      }
    }
  } finally {
    await worker.terminate();
  }

  if (pdf.numPages > maxPages) {
    chunks.push(`\n\n[OCR limited to first ${maxPages} pages out of ${pdf.numPages}.]`);
  }

  return chunks.join('').slice(0, maxChars);
};

export const extractTextFromPdf = async (file: File, options: PdfExtractOptions = {}): Promise<string> => {
  const maxChars = options.maxChars ?? 220000;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  try {
    const selectableText = await extractSelectableText(pdf, maxChars, options.onProgress);

    if (selectableText.trim().length >= MIN_SELECTABLE_TEXT_CHARS) {
      return selectableText;
    }

    options.onProgress?.('Not enough selectable text found. Starting OCR fallback.');
    const ocrText = await extractOcrText(
      pdf,
      maxChars,
      options.ocrLanguage ?? 'chi_sim+eng',
      options.maxOcrPages ?? 20,
      options.onProgress,
    );

    if (!ocrText.trim()) {
      throw new Error('OCR completed but no readable text was found. Try a clearer scan or fewer pages.');
    }

    return ocrText;
  } finally {
    await pdf.destroy().catch(() => {});
  }
};
