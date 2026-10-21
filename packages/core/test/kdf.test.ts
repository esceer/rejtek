import { describe, expect, it } from 'vitest';
import { deriveMasterKeys, generateSalt } from '../src/index';
import { FAST_KDF, sodium } from './support/sodium';

describe('deriveMasterKeys', () => {
  const salt = generateSalt(sodium);

  it('is deterministic for the same password and salt', () => {
    const a = deriveMasterKeys(sodium, 'correct horse', salt, FAST_KDF);
    const b = deriveMasterKeys(sodium, 'correct horse', salt, FAST_KDF);
    expect(a).toEqual(b);
  });

  it('produces independent 32-byte encryption and auth keys', () => {
    const { encryptionKey, authKey } = deriveMasterKeys(sodium, 'correct horse', salt, FAST_KDF);
    expect(encryptionKey).toHaveLength(32);
    expect(authKey).toHaveLength(32);
    expect(encryptionKey).not.toEqual(authKey);
  });

  it('differs for a different password or salt', () => {
    const base = deriveMasterKeys(sodium, 'correct horse', salt, FAST_KDF);
    expect(deriveMasterKeys(sodium, 'correct horsf', salt, FAST_KDF)).not.toEqual(base);
    expect(deriveMasterKeys(sodium, 'correct horse', generateSalt(sodium), FAST_KDF)).not.toEqual(
      base,
    );
  });

  it('normalises Unicode so composed and decomposed input match', () => {
    const composed = deriveMasterKeys(sodium, 'jelszó', salt, FAST_KDF);
    const decomposed = deriveMasterKeys(sodium, 'jelszó', salt, FAST_KDF);
    expect(composed).toEqual(decomposed);
  });

  it('rejects a salt of the wrong length', () => {
    expect(() => deriveMasterKeys(sodium, 'pw', new Uint8Array(8), FAST_KDF)).toThrow(RangeError);
  });
});
