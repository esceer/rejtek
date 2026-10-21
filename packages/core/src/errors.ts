/** Thrown when ciphertext cannot be decrypted: wrong key, tampered data or mismatched context. */
export class DecryptionError extends Error {
  override name = 'DecryptionError';

  constructor(options?: ErrorOptions) {
    super('Decryption failed: wrong key or corrupted data', options);
  }
}

/** Thrown when decrypted data does not have the expected structure. */
export class InvalidFormatError extends Error {
  override name = 'InvalidFormatError';
}
