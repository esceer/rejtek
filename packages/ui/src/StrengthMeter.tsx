import { estimatePasswordStrength, PASSWORD_STRENGTH_LABELS } from '@rejtek/core';
import { cx } from './cx';

export function StrengthMeter({ password }: { password: string }) {
  const strength = estimatePasswordStrength(password);
  const filled = password ? Math.max(strength, 1) : 0;
  return (
    <div>
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cx(
              'h-1 flex-1 rounded-full',
              bar > filled
                ? 'bg-line'
                : strength >= 3
                  ? 'bg-ok'
                  : strength === 2
                    ? 'bg-warn'
                    : 'bg-danger',
            )}
          />
        ))}
      </div>
      <div className="mt-1.5 text-xs text-muted">
        {password
          ? PASSWORD_STRENGTH_LABELS[strength]
          : 'Tip: a few random words is easy to remember and hard to guess'}
      </div>
    </div>
  );
}
