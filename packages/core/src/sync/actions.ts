import type { ApiClient } from '../api/client';
import type { EncryptedVaultItem } from '../vault/item';
import type { SyncDifference } from './diff';

/** What the sync needs from the device's storage. */
export interface LocalSyncStore {
  /** Replaces the local copy with the server's (a server tombstone removes it); marks it synced. */
  applyServerItem(item: EncryptedVaultItem): Promise<void>;
  /** Records that the local copy now equals server version `version`. */
  markSynced(id: string, version: number): Promise<void>;
  /** Drops a local tombstone once the deletion has reached the server. */
  forget(id: string): Promise<void>;
}

type SyncApi = Pick<ApiClient, 'putItem' | 'deleteItem'>;

/** Pull is possible when the server has a copy (live or deleted). */
export const canPull = (difference: SyncDifference): boolean => difference.server !== undefined;

/** Push is possible when this device has a copy (live or deleted). */
export const canPush = (difference: SyncDifference): boolean => difference.local !== undefined;

/** Server copy wins: the device takes the server's version (or deletion). */
export async function pullItem(store: LocalSyncStore, difference: SyncDifference): Promise<void> {
  if (!difference.server) {
    throw new Error(`Nothing to pull for ${difference.id}`);
  }
  await store.applyServerItem(difference.server);
}

/**
 * Device copy wins: the server takes this version (or deletion). The server version seen in the
 * diff is sent as `baseVersion`, so a change made elsewhere since then fails with 409 instead of
 * being overwritten silently.
 */
export async function pushItem(
  api: SyncApi,
  store: LocalSyncStore,
  difference: SyncDifference,
): Promise<void> {
  const { local, server } = difference;
  if (!local) {
    throw new Error(`Nothing to push for ${difference.id}`);
  }
  const baseVersion = server?.version ?? 0;

  if (local.item.deleted) {
    if (server && !server.deleted) {
      await api.deleteItem(local.item.id, baseVersion);
    }
    await store.forget(local.item.id);
    return;
  }

  const saved = await api.putItem(local.item.id, {
    baseVersion,
    updatedAt: local.item.updatedAt,
    data: local.item.data,
  });
  await store.markSynced(saved.id, saved.version);
}

export async function pullAll(
  store: LocalSyncStore,
  differences: readonly SyncDifference[],
): Promise<void> {
  for (const difference of differences.filter(canPull)) {
    await pullItem(store, difference);
  }
}

export async function pushAll(
  api: SyncApi,
  store: LocalSyncStore,
  differences: readonly SyncDifference[],
): Promise<void> {
  for (const difference of differences.filter(canPush)) {
    await pushItem(api, store, difference);
  }
}
