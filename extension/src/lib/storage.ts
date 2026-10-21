import {
  fromBase64,
  toBase64,
  type EncryptedVaultItem,
  type VaultUnlockParams,
} from '@rejtek/core';

/** How this extension reaches the server, plus what it needs to unlock (all but the token non-secret). */
export interface Connection extends VaultUnlockParams {
  readonly url: string;
  readonly username: string;
  readonly deviceId: string;
  readonly deviceToken: string;
}

/** Last item list fetched from the server (ciphertext), for use off the home network. */
export interface ItemsCache {
  readonly items: EncryptedVaultItem[];
  readonly savedAt: string;
}

const CONNECTION = 'connection';
const ITEMS_CACHE = 'itemsCache';
export const SESSION_VAULT_KEY = 'vaultKey';

// storage.local survives restarts; storage.session lives in memory only and is gone when
// Firefox closes, so the vault key is never written to disk.
export const extensionStorage = {
  async getConnection(): Promise<Connection | null> {
    const stored = await browser.storage.local.get(CONNECTION);
    return (stored[CONNECTION] as Connection | undefined) ?? null;
  },

  setConnection: (connection: Connection) =>
    browser.storage.local.set({ [CONNECTION]: connection }),

  async getItemsCache(): Promise<ItemsCache | null> {
    const stored = await browser.storage.local.get(ITEMS_CACHE);
    return (stored[ITEMS_CACHE] as ItemsCache | undefined) ?? null;
  },

  setItemsCache: (cache: ItemsCache) => browser.storage.local.set({ [ITEMS_CACHE]: cache }),

  async getVaultKey(): Promise<Uint8Array | null> {
    const stored = await browser.storage.session.get(SESSION_VAULT_KEY);
    const value = stored[SESSION_VAULT_KEY] as string | undefined;
    return value ? fromBase64(value) : null;
  },

  setVaultKey: (key: Uint8Array) =>
    browser.storage.session.set({ [SESSION_VAULT_KEY]: toBase64(key) }),

  lock: () => browser.storage.session.remove(SESSION_VAULT_KEY),

  /** Forgets the server, the cached items and the key. */
  async clearAll(): Promise<void> {
    await browser.storage.local.remove([CONNECTION, ITEMS_CACHE]);
    await browser.storage.session.clear();
  },
};
