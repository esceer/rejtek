import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../lib/cx';

const variants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-field',
  ghost: 'text-accent hover:bg-accent-soft',
  danger: 'border border-danger-line text-danger hover:bg-danger-soft',
} as const;

const sizes = {
  md: 'h-11 px-4 text-sm',
  sm: 'h-10 px-3 text-sm',
  icon: 'size-10 justify-center',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
