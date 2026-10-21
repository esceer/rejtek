import { useState } from 'react';
import { Button } from './Button';

/** A destructive action with an inline second step instead of a blocking browser dialog. */
export function ConfirmButton({
  label,
  confirmLabel,
  prompt,
  pending,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  prompt: string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          setConfirming(true);
        }}
      >
        {label}
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">{prompt}</span>
      <Button variant="danger" size="sm" disabled={pending} onClick={onConfirm}>
        {confirmLabel}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setConfirming(false);
        }}
      >
        Cancel
      </Button>
    </div>
  );
}
