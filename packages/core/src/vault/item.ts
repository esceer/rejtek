import type { EncryptedBlob } from '../crypto/aead';

/** Decrypted content of a vault item. Exists only in client memory. */
export interface VaultItemData {
  readonly name: string;
  readonly url: string;
  readonly username: string;
  readonly password: string;
  readonly notes: string;
}

interface ItemMetadata {
  /** UUID, stable across devices. */
  readonly id: string;
  /** Incremented on every change; used for sync diffs and optimistic concurrency. */
  readonly version: number;
  /** ISO 8601 timestamp of the last change. */
  readonly updatedAt: string;
}

/** Item as stored on the server and on devices: only metadata is plaintext. */
export type EncryptedVaultItem =
  | (ItemMetadata & { readonly deleted: false; readonly data: EncryptedBlob })
  | (ItemMetadata & { readonly deleted: true; readonly data: null });

const ITEM_FIELDS = ['name', 'url', 'username', 'password', 'notes'] as const;

export function isVaultItemData(value: unknown): value is VaultItemData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return ITEM_FIELDS.every((field) => typeof record[field] === 'string');
}
