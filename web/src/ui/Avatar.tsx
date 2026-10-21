import { cx } from '../lib/cx';

// Dark enough for white text in both themes.
const TINTS = [
  '#B45309',
  '#0F766E',
  '#374151',
  '#B91C1C',
  '#4338CA',
  '#9F1239',
  '#15803D',
  '#1E3A8A',
];

function tintFor(name: string): string {
  let hash = 0;
  for (const char of name.toLowerCase()) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return TINTS[hash % TINTS.length] ?? '#374151';
}

const sizes = {
  sm: 'size-9 rounded-[9px] text-sm',
  lg: 'size-[52px] rounded-xl text-[22px]',
} as const;

export function Avatar({ name, size = 'sm' }: { name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: tintFor(name) }}
      className={cx('flex shrink-0 items-center justify-center font-bold text-white', sizes[size])}
    >
      {Array.from(name.trim())[0]?.toUpperCase() ?? '?'}
    </span>
  );
}
