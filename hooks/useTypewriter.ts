import { useState, useEffect, useRef } from 'react';

const TYPING_SPEED_MS = 30;

export const useTypewriter = (text: string, enabled = true) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<number | null>(null);

  const skipToEnd = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setDisplayedText(text);
    setIsTyping(false);
  };

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);
    let charIndex = 0;

    if (timerRef.current) window.clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      charIndex++;
      setDisplayedText(text.slice(0, charIndex));

      if (charIndex >= text.length) {
        setIsTyping(false);
        if (timerRef.current) window.clearInterval(timerRef.current);
      }
    }, TYPING_SPEED_MS);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [text, enabled]);

  return { displayedText, isTyping, skipToEnd };
};
