import { decrypt, encrypt, type EncryptedBlob } from '../crypto/aead.js';
import type { Sodium } from '../crypto/sodium.js';
import { utf8Decode, utf8Encode } from '../encoding.js';
import { InvalidFormatError } from '../errors.js';
import { isVaultItemData, type VaultItemData } from './item.js';

// Binding the item id prevents swapping ciphertexts between items.
const itemContext = (itemId: string) => `rejtek:item:v1:${itemId}`;

export function encryptItemData(
  sodium: Sodium,
  vaultKey: Uint8Array,
  itemId: string,
  data: VaultItemData,
): EncryptedBlob {
  return encrypt(sodium, vaultKey, utf8Encode(JSON.stringify(data)), itemContext(itemId));
}

/**
 * @throws {DecryptionError} on wrong key, tampering or an id mismatch.
 * @throws {InvalidFormatError} if the plaintext is not a valid item.
 */
export function decryptItemData(
  sodium: Sodium,
  vaultKey: Uint8Array,
  itemId: string,
  blob: EncryptedBlob,
): VaultItemData {
  const parsed: unknown = JSON.parse(
    utf8Decode(decrypt(sodium, vaultKey, blob, itemContext(itemId))),
  );
  if (!isVaultItemData(parsed)) {
    throw new InvalidFormatError('Decrypted item has an unexpected structure');
  }
  return parsed;
}
