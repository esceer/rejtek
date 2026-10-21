import { DecryptionError, unlockVaultKey } from '@rejtek/core';
import { Alert, Button, TextField } from '@rejtek/ui';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { scheduleAutoLock } from '../../lib/auto-lock';
import { loadSodium } from '../../lib/sodium';
import { extensionStorage, type Connection } from '../../lib/storage';
import { PopupShell } from '../PopupShell';

export function LockedView({
  connection,
  onUnlocked,
}: {
  connection: Connection;
  onUnlocked: () => void;
}) {
  const [password, setPassword] = useState('');

  // Works offline: everything needed to unwrap the vault key was stored at pairing time.
  const unlock = useMutation({
    mutationFn: async () => {
      const vaultKey = unlockVaultKey(await loadSodium(), connection, password);
      await extensionStorage.setVaultKey(vaultKey);
      scheduleAutoLock();
    },
    onSuccess: onUnlocked,
  });

  return (
    <PopupShell>
      <div>
        <h1 className="text-lg font-bold">Unlock</h1>
        <p className="mt-1 text-sm text-muted">
          {connection.username} on {new URL(connection.url).host}
        </p>
      </div>
      <form
        noValidate
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (password) {
            unlock.mutate();
          }
        }}
      >
        <TextField
          label="Master password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        {unlock.isError && (
          <Alert tone="danger">
            {unlock.error instanceof DecryptionError
              ? 'Wrong master password.'
              : 'Could not unlock. Please try again.'}
          </Alert>
        )}
        <Button type="submit" disabled={unlock.isPending || password === ''}>
          {unlock.isPending ? 'Unlocking…' : 'Unlock'}
        </Button>
      </form>
    </PopupShell>
  );
}
