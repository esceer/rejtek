import {
  decryptVault,
  encryptItemData,
  type DecryptedVaultItem,
  type VaultItemData,
} from '@rejtek/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadSodium } from '../../lib/sodium';
import { useUnlockedSession } from '../../session/SessionContext';

const VAULT_QUERY_KEY = ['vault'] as const;

/** All live items, decrypted in the browser and sorted by name. */
export function useVaultItems() {
  const { api, session } = useUnlockedSession();
  return useQuery({
    queryKey: VAULT_QUERY_KEY,
    queryFn: async (): Promise<DecryptedVaultItem[]> =>
      decryptVault(await loadSodium(), session.vaultKey, await api.listItems()),
  });
}

export interface SaveItemInput {
  readonly id: string;
  /** Version the edit is based on; 0 for a new item. */
  readonly baseVersion: number;
  readonly data: VaultItemData;
}

export function useSaveItem() {
  const { api, session } = useUnlockedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, baseVersion, data }: SaveItemInput) =>
      api.putItem(id, {
        baseVersion,
        updatedAt: new Date().toISOString(),
        data: encryptItemData(await loadSodium(), session.vaultKey, id, data),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEY }),
  });
}

export function useDeleteItem() {
  const { api } = useUnlockedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, version }: Pick<DecryptedVaultItem, 'id' | 'version'>) =>
      api.deleteItem(id, version),
    onSettled: () => queryClient.invalidateQueries({ queryKey: VAULT_QUERY_KEY }),
  });
}
