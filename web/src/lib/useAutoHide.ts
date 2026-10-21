import { useEffect, useState } from 'react';

/**
 * A reveal toggle that switches itself off after `seconds`.
 * `remaining` is the number of seconds left while visible, `null` while hidden.
 */
export function useAutoHide(seconds: number) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (remaining === null) {
      return;
    }
    const timer = window.setTimeout(() => {
      setRemaining((current) => (current === null || current <= 1 ? null : current - 1));
    }, 1_000);
    return () => {
      clearTimeout(timer);
    };
  }, [remaining]);

  return {
    remaining,
    show: () => {
      setRemaining(seconds);
    },
    hide: () => {
      setRemaining(null);
    },
  };
}
