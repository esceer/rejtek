export type { Sodium } from './crypto/sodium.js';
export { decrypt, encrypt, type EncryptedBlob } from './crypto/aead.js';
export {
  DEFAULT_KDF_PARAMS,
  deriveMasterKeys,
  generateSalt,
  SALT_BYTES,
  type KdfParams,
  type MasterKeys,
} from './crypto/kdf.js';
export { generateVaultKey, unwrapVaultKey, wrapVaultKey } from './crypto/vault-key.js';
export { fromBase64, toBase64 } from './encoding.js';
export { DecryptionError, InvalidFormatError } from './errors.js';
export { isVaultItemData, type EncryptedVaultItem, type VaultItemData } from './vault/item.js';
export { decryptItemData, encryptItemData } from './vault/item-crypto.js';
