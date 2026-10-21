import { useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../lib/cx';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
}

export function TextField({ label, hint, error, className, id, ...props }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error || hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-semibold text-muted">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cx(
          'h-[46px] w-full rounded-[10px] border bg-surface px-3.5 text-[15px] text-ink',
          'outline-none focus:border-2 focus:border-accent',
          error ? 'border-danger' : 'border-line',
        )}
        {...props}
      />
      {(error ?? hint) && (
        <div
          id={describedBy}
          className={cx('mt-1.5 text-xs', error ? 'text-danger' : 'text-muted')}
        >
          {error ?? hint}
        </div>
      )}
    </div>
  );
}
