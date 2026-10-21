import {
  decryptVault,
  encryptItemData,
  type DecryptedVaultItem,
  type VaultItemData,
} from '@rejtek/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { loadSodium } from '../lib/sodium';
import { newItemId } from '../lib/ids';
import { useUnlockedVault } from './VaultProvider';

const LOCAL_VAULT_KEY = ['local-vault'] as const;

/** All live items on this device, decrypted and sorted by name. */
export function useLocalItems() {
  const { store, vaultKey } = useUnlockedVault();
  return useQuery({
    queryKey: LOCAL_VAULT_KEY,
    queryFn: async (): Promise<DecryptedVaultItem[]> => {
      const [sodium, local] = await Promise.all([loadSodium(), store.list()]);
      return decryptVault(
        sodium,
        vaultKey,
        local.map(({ item }) => item),
      );
    },
  });
}

export function useLocalItem(id: string) {
  const items = useLocalItems();
  return { ...items, data: items.data?.find((item) => item.id === id) };
}

/** Saves an item (new when `id` is undefined) and returns its id. */
export function useSaveLocalItem() {
  const { store, vaultKey } = useUnlockedVault();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string | undefined; data: VaultItemData }) => {
      const sodium = await loadSodium();
      const itemId = id ?? newItemId(sodium);
      await store.save(
        itemId,
        encryptItemData(sodium, vaultKey, itemId, data),
        new Date().toISOString(),
      );
      return itemId;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: LOCAL_VAULT_KEY }),
  });
}

export function useDeleteLocalItem() {
  const { store } = useUnlockedVault();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => store.remove(id, new Date().toISOString()),
    onSettled: () => queryClient.invalidateQueries({ queryKey: LOCAL_VAULT_KEY }),
  });
}
