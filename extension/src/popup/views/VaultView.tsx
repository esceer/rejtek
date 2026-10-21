import {
  ApiError,
  decryptVault,
  formatRelative,
  searchItems,
  ServerUnreachableError,
  type ApiClient,
  type DecryptedVaultItem,
} from '@rejtek/core';
import { Alert, Avatar, Button, ConfirmButton, CopyIcon, LockIcon, SearchIcon } from '@rejtek/ui';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { scheduleAutoLock } from '../../lib/auto-lock';
import { currentSiteHost, itemsForSite } from '../../lib/current-site';
import { loadSodium } from '../../lib/sodium';
import { extensionStorage, type Connection } from '../../lib/storage';
import { useCopy } from '../../lib/useCopy';
import { PopupShell } from '../PopupShell';

interface LoadedItems {
  readonly items: DecryptedVaultItem[];
  /** Set when the server was unreachable and the saved copy is shown instead. */
  readonly offlineSince: string | null;
}

export function VaultView({
  connection,
  vaultKey,
  api,
  onLocked,
}: {
  connection: Connection;
  vaultKey: Uint8Array;
  api: ApiClient;
  onLocked: () => void;
}) {
  const [query, setQuery] = useState('');
  const vault = useQuery({
    queryKey: ['items'],
    queryFn: () => loadItems(api, vaultKey),
  });
  const site = useQuery({ queryKey: ['site'], queryFn: currentSiteHost });

  // Opening the popup counts as activity for the auto-lock timer.
  useEffect(scheduleAutoLock, []);

  const lock = () => void extensionStorage.lock().then(onLocked);
  const disconnect = useMutation({
    mutationFn: async () => {
      await api.revokeDevice(connection.deviceId).catch(() => undefined);
      await extensionStorage.clearAll();
    },
    onSuccess: onLocked,
  });

  const items = useMemo(() => vault.data?.items ?? [], [vault.data]);
  const results = useMemo(() => searchItems(items, query), [items, query]);
  const suggested = useMemo(
    () => (query.trim() || !site.data ? [] : itemsForSite(items, site.data)),
    [items, query, site.data],
  );
  const revoked = vault.error instanceof ApiError && vault.error.status === 401;

  return (
    <PopupShell
      actions={
        <Button variant="ghost" size="icon" aria-label="Lock" title="Lock" onClick={lock}>
          <LockIcon />
        </Button>
      }
    >
      <div className="relative">
        <label htmlFor="search" className="sr-only">
          Search vault
        </label>
        <SearchIcon className="pointer-events-none absolute top-[15px] left-3.5 text-muted" />
        <input
          id="search"
          type="search"
          autoFocus
          placeholder={`Search ${String(items.length)} items`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          className="h-12 w-full rounded-[10px] border border-line bg-surface pr-3.5 pl-10 text-base text-ink outline-none focus:border-2 focus:border-accent"
        />
      </div>

      {vault.data?.offlineSince && (
        <p className="text-xs text-muted">
          Server not reachable. Showing the copy saved {formatRelative(vault.data.offlineSince)}.
        </p>
      )}
      {revoked && (
        <Alert tone="danger">This extension was removed on your server. Disconnect below.</Alert>
      )}
      {vault.isError && !revoked && (
        <Alert tone="danger">Cannot reach your server, and there is no saved copy yet.</Alert>
      )}

      {suggested.length > 0 && (
        <Section title={`Suggested for ${site.data ?? ''}`} items={suggested} />
      )}
      {vault.isSuccess && (
        <Section
          title={query.trim() ? `${String(results.length)} matches` : 'All items'}
          items={results}
          empty={items.length === 0 ? 'No items yet.' : 'Nothing matches your search.'}
        />
      )}

      <footer className="mt-auto flex items-center justify-between gap-2 pt-2 text-xs text-muted">
        <a href={connection.url} target="_blank" rel="noopener noreferrer" className="text-accent">
          Open Rejtek
        </a>
        <ConfirmButton
          label="Disconnect"
          confirmLabel="Yes"
          prompt="Disconnect?"
          pending={disconnect.isPending}
          onConfirm={() => {
            disconnect.mutate();
          }}
        />
      </footer>
    </PopupShell>
  );
}

function Section({
  title,
  items,
  empty,
}: {
  title: string;
  items: DecryptedVaultItem[];
  empty?: string;
}) {
  return (
    <section>
      <h2 className="mb-1.5 text-xs font-semibold tracking-wider text-muted uppercase">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-[14px] border border-line bg-surface">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemRow({ item }: { item: DecryptedVaultItem }) {
  const { copy, copied } = useCopy();
  const { name, username, password } = item.data;
  return (
    <li className="flex items-center gap-3 border-b border-line px-3 py-2 last:border-b-0">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{name}</div>
        {username && <div className="truncate text-xs text-muted">{username}</div>}
      </div>
      {username && (
        <CopyButton
          label={`Copy username for ${name}`}
          short="User"
          copied={copied === 'username'}
          onClick={() => void copy('username', username)}
        />
      )}
      <CopyButton
        label={`Copy password for ${name}`}
        short="Pass"
        copied={copied === 'password'}
        onClick={() => void copy('password', password)}
      />
    </li>
  );
}

function CopyButton({
  label,
  short,
  copied,
  onClick,
}: {
  label: string;
  short: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" aria-label={label} title={label} onClick={onClick}>
      {copied ? (
        'Copied'
      ) : (
        <>
          <CopyIcon size={16} />
          {short}
        </>
      )}
    </Button>
  );
}

/** Fresh from the server when reachable (and saved for later), else the saved copy. */
async function loadItems(api: ApiClient, vaultKey: Uint8Array): Promise<LoadedItems> {
  const sodium = await loadSodium();
  try {
    const items = await api.listItems();
    await extensionStorage.setItemsCache({ items, savedAt: new Date().toISOString() });
    return { items: decryptVault(sodium, vaultKey, items), offlineSince: null };
  } catch (error) {
    const cache =
      error instanceof ServerUnreachableError ? await extensionStorage.getItemsCache() : null;
    if (!cache) {
      throw error;
    }
    return { items: decryptVault(sodium, vaultKey, cache.items), offlineSince: cache.savedAt };
  }
}
