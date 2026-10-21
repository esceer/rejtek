import { generatePassword, type DecryptedVaultItem, type VaultItemData } from '@rejtek/core';
import { useId, useState } from 'react';
import { Alert, Button, Card, RefreshIcon, StrengthMeter, TextField } from '@rejtek/ui';
import { loadSodium } from '../../lib/sodium';
import { vaultErrorMessage } from './messages';
import { useSaveItem } from './useVault';

const EMPTY: VaultItemData = { name: '', url: '', username: '', password: '', notes: '' };

/** Creates a new item (`item` undefined) or edits an existing one. */
export function ItemEditor({
  item,
  onSaved,
  onCancel,
}: {
  item?: DecryptedVaultItem;
  onSaved: (id: string) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<VaultItemData>(item?.data ?? EMPTY);
  const [nameError, setNameError] = useState<string>();
  const save = useSaveItem();
  const notesId = useId();

  const set = (field: keyof VaultItemData) => (value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    if (!data.name.trim()) {
      setNameError('Give the item a name.');
      return;
    }
    const id = item?.id ?? crypto.randomUUID();
    save.mutate(
      { id, baseVersion: item?.version ?? 0, data: { ...data, name: data.name.trim() } },
      {
        onSuccess: () => {
          onSaved(id);
        },
      },
    );
  };

  return (
    <Card className="min-w-0 flex-[999_1_480px] p-7">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h2 className="text-[22px] font-bold">{item ? 'Edit item' : 'New item'}</h2>
        <TextField
          label="Name"
          autoFocus
          value={data.name}
          error={nameError}
          onChange={(e) => {
            set('name')(e.target.value);
          }}
        />
        <TextField
          label="Website"
          inputMode="url"
          placeholder="netflix.com"
          value={data.url}
          onChange={(e) => {
            set('url')(e.target.value);
          }}
        />
        <TextField
          label="Username"
          autoComplete="off"
          value={data.username}
          onChange={(e) => {
            set('username')(e.target.value);
          }}
        />
        <div className="flex flex-col gap-2.5">
          <div className="flex items-end gap-2">
            <TextField
              label="Password"
              className="flex-1"
              autoComplete="new-password"
              spellCheck={false}
              value={data.password}
              onChange={(e) => {
                set('password')(e.target.value);
              }}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <Button
              variant="secondary"
              size="icon"
              className="mb-px size-[46px]"
              aria-label="Generate a strong password"
              title="Generate a strong password"
              onClick={() =>
                void loadSodium().then((sodium) => {
                  set('password')(generatePassword(sodium));
                })
              }
            >
              <RefreshIcon />
            </Button>
          </div>
          <StrengthMeter password={data.password} />
        </div>
        <div>
          <label htmlFor={notesId} className="mb-1.5 block text-[13px] font-semibold text-muted">
            Notes
          </label>
          <textarea
            id={notesId}
            rows={3}
            value={data.notes}
            onChange={(e) => {
              set('notes')(e.target.value);
            }}
            className="w-full resize-y rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[15px] text-ink outline-none focus:border-2 focus:border-accent"
          />
        </div>
        {save.isError && <Alert tone="danger">{vaultErrorMessage(save.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
