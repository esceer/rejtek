import { displayHost, formatDate, safeHref, type DecryptedVaultItem } from '@rejtek/core';
import type { ReactNode } from 'react';
import { useAutoHide } from '../../lib/useAutoHide';
import { useClipboard } from '../../lib/useClipboard';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { ConfirmButton } from '../../ui/ConfirmButton';
import { CopyIcon, EyeIcon, EyeOffIcon } from '../../ui/icons';
import { vaultErrorMessage } from './messages';
import { useDeleteItem } from './useVault';

const REVEAL_SECONDS = 30;

export function ItemDetail({
  item,
  onEdit,
  onDeleted,
}: {
  item: DecryptedVaultItem;
  onEdit: () => void;
  onDeleted: () => void;
}) {
  const { data } = item;
  const reveal = useAutoHide(REVEAL_SECONDS);
  const { copy, copied } = useClipboard();
  const href = safeHref(data.url);

  return (
    <Card className="min-w-0 flex-[999_1_480px] p-7">
      <div className="mb-7 flex items-center gap-4">
        <Avatar name={data.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[22px] font-bold">{data.name}</h2>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-accent"
            >
              {displayHost(data.url)}
            </a>
          ) : (
            data.url && <span className="text-sm text-muted">{data.url}</span>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={onEdit}>
          Edit
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {data.username && (
          <Field label="Username">
            <span className="min-w-0 flex-1 truncate text-[15px]">{data.username}</span>
            <CopyButton
              label="Copy username"
              copied={copied === 'username'}
              onClick={() => void copy('username', data.username)}
            />
          </Field>
        )}
        <Field label="Password">
          {reveal.remaining === null ? (
            <span className="flex-1 text-lg tracking-[0.15em]" aria-label="Password hidden">
              ••••••••••••
            </span>
          ) : (
            <span className="min-w-0 flex-1 font-mono text-[15px] break-all">{data.password}</span>
          )}
          {reveal.remaining === null ? (
            <Button variant="ghost" size="sm" onClick={reveal.show}>
              <EyeIcon />
              Reveal
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={reveal.hide}>
              <EyeOffIcon />
              Hide ({reveal.remaining}s)
            </Button>
          )}
          <CopyButton
            label="Copy password"
            copied={copied === 'password'}
            onClick={() => void copy('password', data.password)}
          />
        </Field>
        {data.notes && (
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-muted">Notes</div>
            <div className="rounded-[10px] bg-field px-3.5 py-3 text-[15px] leading-normal whitespace-pre-wrap">
              {data.notes}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[13px] text-muted">Updated {formatDate(item.updatedAt)}</span>
        <DeleteControl item={item} onDeleted={onDeleted} />
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[13px] font-semibold text-muted">{label}</div>
      <div className="flex min-h-12 items-center gap-2 rounded-[10px] bg-field py-1 pr-1.5 pl-3.5">
        {children}
      </div>
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="icon" aria-label={label} title={label} onClick={onClick}>
      {copied ? <span className="text-xs font-semibold">Copied</span> : <CopyIcon />}
    </Button>
  );
}

function DeleteControl({ item, onDeleted }: { item: DecryptedVaultItem; onDeleted: () => void }) {
  const remove = useDeleteItem();
  if (remove.isError) {
    return <span className="text-sm text-danger">{vaultErrorMessage(remove.error)}</span>;
  }
  return (
    <ConfirmButton
      label="Delete"
      confirmLabel="Yes, delete"
      prompt={`Delete “${item.data.name}”?`}
      pending={remove.isPending}
      onConfirm={() => {
        remove.mutate(item, { onSuccess: onDeleted });
      }}
    />
  );
}
