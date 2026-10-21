import type { Sodium } from '../crypto/sodium.js';
import { decryptItemData } from './item-crypto.js';
import type { EncryptedVaultItem, VaultItemData } from './item.js';

/** A live (non-deleted) item, decrypted for display. */
export interface DecryptedVaultItem {
  readonly id: string;
  readonly version: number;
  readonly updatedAt: string;
  readonly data: VaultItemData;
}

/** Decrypts all live items, sorted by name. Tombstones are skipped. */
export function decryptVault(
  sodium: Sodium,
  vaultKey: Uint8Array,
  items: readonly EncryptedVaultItem[],
): DecryptedVaultItem[] {
  return items
    .flatMap((item) =>
      item.deleted
        ? []
        : [
            {
              id: item.id,
              version: item.version,
              updatedAt: item.updatedAt,
              data: decryptItemData(sodium, vaultKey, item.id, item.data),
            },
          ],
    )
    .sort((a, b) => a.data.name.localeCompare(b.data.name, undefined, { sensitivity: 'base' }));
}

/** Case- and accent-insensitive match on name, URL and username. */
export function searchItems(
  items: readonly DecryptedVaultItem[],
  query: string,
): DecryptedVaultItem[] {
  const needle = normalize(query.trim());
  if (!needle) {
    return [...items];
  }
  return items.filter(({ data }) =>
    [data.name, data.url, data.username].some((field) => normalize(field).includes(needle)),
  );
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}
