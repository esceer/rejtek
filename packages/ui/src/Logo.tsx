import { LockIcon } from './icons';

export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span className="flex items-center gap-2.5 text-accent">
      <LockIcon size={size === 'lg' ? 28 : 22} />
      <span
        className={size === 'lg' ? 'text-2xl font-bold text-ink' : 'text-lg font-bold text-ink'}
      >
        Rejtek
      </span>
    </span>
  );
}
