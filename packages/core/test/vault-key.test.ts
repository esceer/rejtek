import { describe, expect, it } from 'vitest';
import {
  DecryptionError,
  deriveMasterKeys,
  generateSalt,
  generateVaultKey,
  unwrapVaultKey,
  wrapVaultKey,
} from '../src/index';
import { FAST_KDF, sodium } from './support/sodium';

describe('vault key wrapping', () => {
  const salt = generateSalt(sodium);
  const { encryptionKey } = deriveMasterKeys(sodium, 'master', salt, FAST_KDF);
  const vaultKey = generateVaultKey(sodium);

  it('unwraps with the same master password', () => {
    const wrapped = wrapVaultKey(sodium, vaultKey, encryptionKey);
    const again = deriveMasterKeys(sodium, 'master', salt, FAST_KDF).encryptionKey;
    expect(unwrapVaultKey(sodium, wrapped, again)).toEqual(vaultKey);
  });

  it('fails with a different master password', () => {
    const wrapped = wrapVaultKey(sodium, vaultKey, encryptionKey);
    const wrong = deriveMasterKeys(sodium, 'not master', salt, FAST_KDF).encryptionKey;
    expect(() => unwrapVaultKey(sodium, wrapped, wrong)).toThrow(DecryptionError);
  });
});
