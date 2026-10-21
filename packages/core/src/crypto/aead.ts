import { fromBase64, toBase64 } from '../encoding.js';
import { DecryptionError } from '../errors.js';
import type { Sodium } from './sodium.js';

export const KEY_BYTES = 32;
const NONCE_BYTES = 24;

/** Serializable ciphertext produced by {@link encrypt}. Safe to store or send anywhere. */
export interface EncryptedBlob {
  /** Format version, so the algorithm can change later without breaking stored data. */
  readonly v: 1;
  /** Base64 random nonce (XChaCha20-Poly1305, 24 bytes). */
  readonly nonce: string;
  /** Base64 ciphertext including the Poly1305 tag. */
  readonly ciphertext: string;
}

/**
 * Encrypts with XChaCha20-Poly1305 under a fresh random nonce.
 *
 * `associatedData` binds the ciphertext to its context (e.g. the item id), so a
 * blob moved to another context fails to decrypt.
 */
export function encrypt(
  sodium: Sodium,
  key: Uint8Array,
  plaintext: Uint8Array,
  associatedData: string,
): EncryptedBlob {
  const nonce = sodium.randombytes_buf(NONCE_BYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    associatedData,
    null,
    nonce,
    key,
  );
  return { v: 1, nonce: toBase64(nonce), ciphertext: toBase64(ciphertext) };
}

/** @throws {DecryptionError} on wrong key, tampered data or mismatched associated data. */
export function decrypt(
  sodium: Sodium,
  key: Uint8Array,
  blob: EncryptedBlob,
  associatedData: string,
): Uint8Array {
  try {
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      fromBase64(blob.ciphertext),
      associatedData,
      fromBase64(blob.nonce),
      key,
    );
  } catch (cause) {
    throw new DecryptionError({ cause });
  }
}
