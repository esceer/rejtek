import { decrypt, encrypt, KEY_BYTES, type EncryptedBlob } from './aead';
import type { Sodium } from './sodium';

const VAULT_KEY_CONTEXT = 'rejtek:vault-key:v1';

/** Random key that encrypts all items of one vault. Stored only in wrapped form. */
export function generateVaultKey(sodium: Sodium): Uint8Array {
  return sodium.randombytes_buf(KEY_BYTES);
}

export function wrapVaultKey(
  sodium: Sodium,
  vaultKey: Uint8Array,
  encryptionKey: Uint8Array,
): EncryptedBlob {
  return encrypt(sodium, encryptionKey, vaultKey, VAULT_KEY_CONTEXT);
}

/** @throws {DecryptionError} if `encryptionKey` came from a different master password. */
export function unwrapVaultKey(
  sodium: Sodium,
  wrappedVaultKey: EncryptedBlob,
  encryptionKey: Uint8Array,
): Uint8Array {
  return decrypt(sodium, encryptionKey, wrappedVaultKey, VAULT_KEY_CONTEXT);
}
