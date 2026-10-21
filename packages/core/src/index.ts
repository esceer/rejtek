export type { Sodium } from './crypto/sodium';
export { decrypt, encrypt, type EncryptedBlob } from './crypto/aead';
export {
  DEFAULT_KDF_PARAMS,
  deriveMasterKeys,
  generateSalt,
  SALT_BYTES,
  type KdfParams,
  type MasterKeys,
} from './crypto/kdf';
export { generateVaultKey, unwrapVaultKey, wrapVaultKey } from './crypto/vault-key';
export { fromBase64, toBase64 } from './encoding';
export { DecryptionError, InvalidFormatError } from './errors';
export { isVaultItemData, type EncryptedVaultItem, type VaultItemData } from './vault/item';
export { decryptItemData, encryptItemData } from './vault/item-crypto';
export { createAccount, signIn, type UnlockedSession } from './account';
export { createApiClient, type ApiClient, type ApiClientOptions } from './api/client';
export type * from './api/contracts';
export { ApiError, ServerUnreachableError } from './api/errors';
export { encodePairingPayload, parsePairingPayload, type PairingPayload } from './pairing';
export { decryptVault, searchItems, type DecryptedVaultItem } from './vault/vault';
export {
  estimatePasswordStrength,
  PASSWORD_STRENGTH_LABELS,
  type PasswordStrength,
} from './password-strength';
export { DEFAULT_PASSWORD_LENGTH, generatePassword } from './password-generator';
export {
  avatarLetter,
  avatarTint,
  displayHost,
  formatDate,
  formatRelative,
  safeHref,
} from './display';
export {
  canPull,
  canPush,
  pullAll,
  pullItem,
  pushAll,
  pushItem,
  type LocalSyncStore,
} from './sync/actions';
export { diffVaults, type DiffKind, type LocalSyncItem, type SyncDifference } from './sync/diff';
