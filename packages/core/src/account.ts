import type { ApiClient } from './api/client';
import { DEFAULT_KDF_PARAMS, deriveMasterKeys, generateSalt, type KdfParams } from './crypto/kdf';
import type { Sodium } from './crypto/sodium';
import { generateVaultKey, unwrapVaultKey, wrapVaultKey } from './crypto/vault-key';
import type { EncryptedBlob } from './crypto/aead';
import { fromBase64, toBase64 } from './encoding';

export interface UnlockedSession {
  readonly username: string;
  readonly token: string;
  readonly expiresAt: string;
  /** Decrypts the vault. Keep in memory only. */
  readonly vaultKey: Uint8Array;
}

/** Creates the vault key locally and registers with only the auth key and the wrapped vault key. */
export async function createAccount(
  sodium: Sodium,
  api: ApiClient,
  username: string,
  masterPassword: string,
  kdf: KdfParams = DEFAULT_KDF_PARAMS,
): Promise<void> {
  const salt = generateSalt(sodium);
  const { encryptionKey, authKey } = deriveMasterKeys(sodium, masterPassword, salt, kdf);
  await api.register({
    username,
    salt: toBase64(salt),
    kdf,
    authKey: toBase64(authKey),
    wrappedVaultKey: wrapVaultKey(sodium, generateVaultKey(sodium), encryptionKey),
  });
}

/** What a client needs to unlock a vault with the master password (all non-secret). */
export interface VaultUnlockParams {
  readonly salt: string;
  readonly kdf: KdfParams;
  readonly wrappedVaultKey: EncryptedBlob;
}

/**
 * Master password → vault key, entirely on the device.
 * @throws {DecryptionError} for a wrong master password.
 */
export function unlockVaultKey(
  sodium: Sodium,
  params: VaultUnlockParams,
  masterPassword: string,
): Uint8Array {
  const { encryptionKey } = deriveMasterKeys(
    sodium,
    masterPassword,
    fromBase64(params.salt),
    params.kdf,
  );
  return unwrapVaultKey(sodium, params.wrappedVaultKey, encryptionKey);
}

/** @throws {ApiError} 404 (unknown user) or 401 (wrong password). */
export async function signIn(
  sodium: Sodium,
  api: ApiClient,
  username: string,
  masterPassword: string,
): Promise<UnlockedSession> {
  const { salt, kdf } = await api.prelogin(username);
  const { encryptionKey, authKey } = deriveMasterKeys(
    sodium,
    masterPassword,
    fromBase64(salt),
    kdf,
  );
  const login = await api.login(username, toBase64(authKey));
  return {
    username,
    token: login.token,
    expiresAt: login.expiresAt,
    vaultKey: unwrapVaultKey(sodium, login.wrappedVaultKey, encryptionKey),
  };
}
