import { describe, expect, it } from 'vitest';
import { DecryptionError, decrypt, encrypt, fromBase64, toBase64 } from '../src/index';
import { sodium } from './support/sodium';

const key = sodium.randombytes_buf(32);
const plaintext = new TextEncoder().encode('secret');

describe('encrypt / decrypt', () => {
  it('round-trips', () => {
    const blob = encrypt(sodium, key, plaintext, 'ctx');
    expect(decrypt(sodium, key, blob, 'ctx')).toEqual(plaintext);
  });

  it('uses a fresh nonce every time', () => {
    const a = encrypt(sodium, key, plaintext, 'ctx');
    const b = encrypt(sodium, key, plaintext, 'ctx');
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('fails with the wrong key', () => {
    const blob = encrypt(sodium, key, plaintext, 'ctx');
    expect(() => decrypt(sodium, sodium.randombytes_buf(32), blob, 'ctx')).toThrow(DecryptionError);
  });

  it('fails with different associated data', () => {
    const blob = encrypt(sodium, key, plaintext, 'ctx');
    expect(() => decrypt(sodium, key, blob, 'other')).toThrow(DecryptionError);
  });

  it('fails when the ciphertext is tampered with', () => {
    const blob = encrypt(sodium, key, plaintext, 'ctx');
    const bytes = fromBase64(blob.ciphertext);
    bytes[0] = (bytes[0] ?? 0) ^ 1;
    expect(() => decrypt(sodium, key, { ...blob, ciphertext: toBase64(bytes) }, 'ctx')).toThrow(
      DecryptionError,
    );
  });
});
