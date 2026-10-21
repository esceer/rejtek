import { useCallback, useEffect, useRef, useState } from 'react';

const CLEAR_AFTER_MS = 30_000;
const FEEDBACK_MS = 1_500;

/**
 * Copies text and clears the clipboard again after 30 s, so copied passwords don't linger.
 * `copied` holds the key of the last copied value for a short "Copied" confirmation.
 */
export function useClipboard() {
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

  const copy = useCallback(async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
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
  }, []);

  return { copy, copied };
}
