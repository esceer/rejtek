import type { Sodium } from './sodium.js';

export interface KdfParams {
  readonly algorithm: 'argon2id';
  readonly opsLimit: number;
  readonly memLimitBytes: number;
}

/** 64 MiB, 3 passes: fast enough on phones, comparable to common password-manager defaults. */
export const DEFAULT_KDF_PARAMS: KdfParams = {
  algorithm: 'argon2id',
  opsLimit: 3,
  memLimitBytes: 64 * 1024 * 1024,
};

export const SALT_BYTES = 16;

const ARGON2ID13 = 2; // crypto_pwhash_ALG_ARGON2ID13
const KEY_BYTES = 32;
const SUBKEY_CONTEXT = 'rejtekmk'; // libsodium requires exactly 8 characters
const SubkeyId = { encryption: 1, auth: 2 } as const;

export interface MasterKeys {
  /** Wraps the vault key. Never leaves the device. */
  readonly encryptionKey: Uint8Array;
  /** Proves knowledge of the master password to the server (server stores only its hash). */
  readonly authKey: Uint8Array;
}

export function generateSalt(sodium: Sodium): Uint8Array {
  return sodium.randombytes_buf(SALT_BYTES);
}

/**
 * Master password → Argon2id master key → two independent subkeys.
 * The password is NFKC-normalised so the same text yields the same key on every platform.
 */
export function deriveMasterKeys(
  sodium: Sodium,
  masterPassword: string,
  salt: Uint8Array,
  params: KdfParams = DEFAULT_KDF_PARAMS,
): MasterKeys {
  if (salt.length !== SALT_BYTES) {
    throw new RangeError(`Salt must be ${String(SALT_BYTES)} bytes`);
  }
  const masterKey = sodium.crypto_pwhash(
    KEY_BYTES,
    masterPassword.normalize('NFKC'),
    salt,
    params.opsLimit,
    params.memLimitBytes,
    ARGON2ID13,
  );
  const subkey = (id: number) =>
    sodium.crypto_kdf_derive_from_key(KEY_BYTES, id, SUBKEY_CONTEXT, masterKey);
  return { encryptionKey: subkey(SubkeyId.encryption), authKey: subkey(SubkeyId.auth) };
}
