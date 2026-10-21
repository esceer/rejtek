import {
  diffVaults,
  pullAll,
  pullItem,
  pushAll,
  pushItem,
  type ApiClient,
  type SyncDifference,
} from '@rejtek/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadSodium } from '../lib/sodium';
import { useUnlockedVault } from '../vault/VaultProvider';

const LAST_SYNC_SETTING = 'lastSyncAt';
const keys = {
  diff: ['sync-diff'],
  lastSync: ['last-sync'],
  pending: ['pending-changes'],
  localVault: ['local-vault'],
} as const;

export interface SyncState {
  readonly differences: SyncDifference[];
  /** Live items on either side, for "Compared N items". */
  readonly compared: number;
}

/** Fetches the server's items and compares them with this phone's. Never cached. */
export function useSyncDiff(api: ApiClient) {
  const { store, vaultKey } = useUnlockedVault();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: keys.diff,
    gcTime: 0,
    queryFn: async (): Promise<SyncState> => {
      const [sodium, serverItems, localItems] = await Promise.all([
        loadSodium(),
        api.listItems(),
        store.list(),
      ]);
      const differences = diffVaults(sodium, vaultKey, localItems, serverItems);
      if (differences.length === 0) {
        await store.setSetting(LAST_SYNC_SETTING, new Date().toISOString());
        void queryClient.invalidateQueries({ queryKey: keys.lastSync });
      }
      const live = new Set([
        ...localItems.filter((entry) => !entry.item.deleted).map((entry) => entry.item.id),
        ...serverItems.filter((item) => !item.deleted).map((item) => item.id),
      ]);
      return { differences, compared: live.size };
    },
  });
}

export type SyncAction =
  | { readonly type: 'pull' | 'push'; readonly difference: SyncDifference }
  | { readonly type: 'pull-all' | 'push-all'; readonly differences: SyncDifference[] };

export function useSyncAction(api: ApiClient) {
  const { store } = useUnlockedVault();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: SyncAction) => {
      switch (action.type) {
        case 'pull':
          return pullItem(store, action.difference);
        case 'push':
          return pushItem(api, store, action.difference);
        case 'pull-all':
          return pullAll(store, action.differences);
        case 'push-all':
          return pushAll(api, store, action.differences);
      }
    },
    // Re-diff after every action (also after a 409: someone changed the item meanwhile).
    onSettled: () =>
      Promise.all(
        [keys.diff, keys.localVault, keys.pending].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}

/** When this phone last found itself in sync with the server (ISO string), if ever. */
export function useLastSync() {
  const { store } = useUnlockedVault();
  return useQuery({
    queryKey: keys.lastSync,
    queryFn: () => store.getSetting(LAST_SYNC_SETTING),
  });
}

/** Items changed on this phone since the last sync (works offline). */
export function usePendingChanges() {
  const { store } = useUnlockedVault();
  return useQuery({
    queryKey: keys.pending,
    queryFn: async () =>
      (await store.list()).filter((entry) => entry.item.version > entry.syncedVersion).length,
  });
}
