import { avatarLetter, avatarTint } from '@rejtek/core';
import { cx } from '../lib/cx';

const sizes = {
  sm: 'size-9 rounded-[9px] text-sm',
  lg: 'size-[52px] rounded-xl text-[22px]',
} as const;

export function Avatar({ name, size = 'sm' }: { name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: avatarTint(name) }}
      className={cx('flex shrink-0 items-center justify-center font-bold text-white', sizes[size])}
    >
      {avatarLetter(name)}
    </span>
  );
}
