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
export { createAccount, signIn, type UnlockedSession } from './account.js';
export { createApiClient, type ApiClient, type ApiClientOptions } from './api/client.js';
export type * from './api/contracts.js';
export { ApiError, ServerUnreachableError } from './api/errors.js';
export { encodePairingPayload, parsePairingPayload, type PairingPayload } from './pairing.js';
export { decryptVault, searchItems, type DecryptedVaultItem } from './vault/vault.js';
