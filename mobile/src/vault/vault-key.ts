import { fromBase64, generateVaultKey, toBase64, type Sodium } from '@rejtek/core';
import * as SecureStore from 'expo-secure-store';

const VAULT_KEY = 'rejtek.vault-key.v1';

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
  hasStoredItems: boolean,
): Promise<Uint8Array> {
  const stored = await SecureStore.getItemAsync(VAULT_KEY);
  if (stored) {
    return fromBase64(stored);
  }
  if (hasStoredItems) {
    throw new VaultKeyMissingError('Vault key not found');
  }
  const key = generateVaultKey(sodium);
  await SecureStore.setItemAsync(VAULT_KEY, toBase64(key), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return key;
}
