import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

type Token =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; display: boolean };

const HIGHLIGHT_PATTERN = /(\bdefinition\b|\btheorem\b|\blemma\b|\bproposition\b|\bcorollary\b|\bproof\b|\bkey\b|\bimportant\b|\bconclusion\b|\bnote\b|\bwarning\b|\bintuition\b|\u5b9a\u4e49|\u5b9a\u7406|\u5f15\u7406|\u547d\u9898|\u63a8\u8bba|\u8bc1\u660e|\u91cd\u70b9|\u5173\u952e|\u6ce8\u610f|\u6613\u9519|\u7ed3\u8bba|\u76f4\u89c9)/gi;

const findNextMath = (text: string, start: number) => {
  const delimiters = [
    { open: '$$', close: '$$', display: true },
    { open: '\\[', close: '\\]', display: true },
    { open: '\\(', close: '\\)', display: false },
    { open: '$', close: '$', display: false },
  ];

  let best: { index: number; open: string; close: string; display: boolean } | null = null;

  for (const delimiter of delimiters) {
    const index = text.indexOf(delimiter.open, start);
    if (index >= 0 && (!best || index < best.index)) {
      best = { index, ...delimiter };
    }
  }

  return best;
};

const tokenizeLatex = (text: string): Token[] => {
  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const next = findNextMath(text, cursor);
    if (!next) {
      tokens.push({ type: 'text', value: text.slice(cursor) });
      break;
    }

    if (next.index > cursor) {
      tokens.push({ type: 'text', value: text.slice(cursor, next.index) });
    }

    const mathStart = next.index + next.open.length;
    const mathEnd = text.indexOf(next.close, mathStart);

    if (mathEnd < 0) {
      tokens.push({ type: 'text', value: text.slice(next.index) });
      break;
    }

    const value = text.slice(mathStart, mathEnd).trim();
    if (value) {
      tokens.push({ type: 'math', value, display: next.display });
    }

    cursor = mathEnd + next.close.length;
  }

  return tokens;
};

const renderText = (value: string, keyPrefix: string) => {
  const segments = value.split(HIGHLIGHT_PATTERN);

  return segments.map((segment, index) => {
    if (!segment) return null;

    if (HIGHLIGHT_PATTERN.test(segment)) {
      HIGHLIGHT_PATTERN.lastIndex = 0;
      return (
        <mark
          key={`${keyPrefix}-${index}`}
          className="mx-0.5 rounded-md bg-amber-200/90 px-1.5 py-0.5 font-black text-slate-950 shadow-[0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-amber-300"
        >
          {segment}
        </mark>
      );
    }

    HIGHLIGHT_PATTERN.lastIndex = 0;
    return <React.Fragment key={`${keyPrefix}-${index}`}>{segment}</React.Fragment>;
  });
};

export const LatexText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const tokens = tokenizeLatex(text);

  return (
    <span className={className}>
      {tokens.map((token, index) => {
        if (token.type === 'text') {
          return <React.Fragment key={index}>{renderText(token.value, `text-${index}`)}</React.Fragment>;
        }

        try {
          const html = katex.renderToString(token.value, {
            displayMode: token.display,
            throwOnError: false,
            strict: false,
            trust: false,
          });

          return (
            <span
              key={index}
              className={token.display
                ? 'block my-4 overflow-x-auto rounded-xl bg-indigo-50/95 px-4 py-3 text-center text-indigo-950 shadow-inner ring-1 ring-indigo-200'
                : 'inline-flex max-w-full items-baseline overflow-x-auto rounded-md bg-amber-100/95 px-1.5 py-0.5 align-baseline text-indigo-950 shadow-sm ring-1 ring-amber-300/80'
              }
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          return <React.Fragment key={index}>{token.display ? `$$${token.value}$$` : `$${token.value}$`}</React.Fragment>;
        }
      })}
    </span>
  );
};
