import type { ReactNode } from 'react';
import { cx } from './cx';
import { WarningIcon } from './icons';

const tones = {
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
} as const;

export function Alert({ tone, children }: { tone: keyof typeof tones; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cx('flex gap-2.5 rounded-xl px-4 py-3.5 text-sm leading-normal', tones[tone])}
    >
      <WarningIcon size={20} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}
