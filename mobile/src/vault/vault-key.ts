import {
  decryptItemData,
  encryptItemData,
  fromBase64,
  generateVaultKey,
  toBase64,
  type Sodium,
} from '@rejtek/core';
import * as SecureStore from 'expo-secure-store';
import type { LocalVaultStore } from './local-store';

const VAULT_KEY = 'rejtek.vault-key.v1';
/** Holds the new key while items are being re-encrypted (see replaceVaultKey). */
const PENDING_VAULT_KEY = 'rejtek.vault-key.pending';
const STORE_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

/** The vault key is gone although encrypted items exist (e.g. app data partially cleared). */
export class VaultKeyMissingError extends Error {
  override name = 'VaultKeyMissingError';
}

/**
 * Loads the device's vault key from the Android Keystore-backed SecureStore, creating one on
 * first use. Access is gated by device authentication in the UI (see device-auth.ts) rather
 * than by a biometric-bound key, so adding a fingerprint can never make the vault unreadable.
 */
export async function loadOrCreateVaultKey(
  sodium: Sodium,
  store: LocalVaultStore,
): Promise<Uint8Array> {
  await finishInterruptedKeyChange(sodium, store);

  const stored = await SecureStore.getItemAsync(VAULT_KEY);
  if (stored) {
    return fromBase64(stored);
  }
  if ((await store.count()) > 0) {
    throw new VaultKeyMissingError('Vault key not found');
  }
  const key = generateVaultKey(sodium);
  await SecureStore.setItemAsync(VAULT_KEY, toBase64(key), STORE_OPTIONS);
  return key;
}

/**
 * Switches the vault to `newKey` (e.g. the account key after pairing), re-encrypting every item.
 * Crash-safe: the new key is parked first, items are rewritten in one transaction, then the key
 * is promoted. An interruption is resolved on the next unlock.
 */
export async function replaceVaultKey(
  sodium: Sodium,
  store: LocalVaultStore,
  oldKey: Uint8Array,
  newKey: Uint8Array,
): Promise<void> {
  await SecureStore.setItemAsync(PENDING_VAULT_KEY, toBase64(newKey), STORE_OPTIONS);
  await store.reencryptAll((id, data) =>
    encryptItemData(sodium, newKey, id, decryptItemData(sodium, oldKey, id, data)),
  );
  await SecureStore.setItemAsync(VAULT_KEY, toBase64(newKey), STORE_OPTIONS);
  await SecureStore.deleteItemAsync(PENDING_VAULT_KEY);
}

/** If a key change was interrupted, keep whichever key the stored items are encrypted with. */
async function finishInterruptedKeyChange(sodium: Sodium, store: LocalVaultStore): Promise<void> {
  const pending = await SecureStore.getItemAsync(PENDING_VAULT_KEY);
  if (!pending) {
    return;
  }
  const sample = await store.firstLiveItem();
  const rewritten =
    sample === null ||
    (!sample.deleted && decryptsWith(sodium, fromBase64(pending), sample.id, sample.data));
  if (rewritten) {
    await SecureStore.setItemAsync(VAULT_KEY, pending, STORE_OPTIONS);
  }
  await SecureStore.deleteItemAsync(PENDING_VAULT_KEY);
}

function decryptsWith(
  sodium: Sodium,
  key: Uint8Array,
  id: string,
  data: Parameters<typeof decryptItemData>[3],
): boolean {
  try {
    decryptItemData(sodium, key, id, data);
    return true;
  } catch {
    return false;
  }
}
