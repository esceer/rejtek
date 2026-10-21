import type { HTMLAttributes } from 'react';
import { cx } from '../lib/cx';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('rounded-[14px] border border-line bg-surface', className)} {...props} />
  );
}
