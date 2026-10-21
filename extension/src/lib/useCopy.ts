import { useEffect, useRef, useState } from 'react';
import { scheduleAutoLock } from './auto-lock';

const CLEAR_AFTER_MS = 30_000;
const FEEDBACK_MS = 1_500;

/**
 * Copies to the clipboard and shows "Copied" briefly. The clipboard is cleared after 30 s,
 * as long as the popup is still open (a closed popup can no longer touch the clipboard).
 */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(
    () => () => {
      timers.current.forEach((timer) => {
        clearTimeout(timer);
      });
    },
    [],
  );

  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    scheduleAutoLock();
    setCopied(key);
    timers.current.push(
      window.setTimeout(() => {
        setCopied((current) => (current === key ? null : current));
      }, FEEDBACK_MS),
      window.setTimeout(
        () => void navigator.clipboard.writeText('').catch(() => undefined),
        CLEAR_AFTER_MS,
      ),
    );
  };

  return { copy, copied };
}
