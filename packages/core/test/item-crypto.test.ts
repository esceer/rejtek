import { describe, expect, it } from 'vitest';
import {
  DecryptionError,
  decryptItemData,
  encryptItemData,
  generateVaultKey,
  InvalidFormatError,
  type VaultItemData,
} from '../src/index.js';
import { sodium } from './support/sodium.js';

const vaultKey = generateVaultKey(sodium);
const netflix: VaultItemData = {
  name: 'Netflix',
  url: 'https://netflix.com',
  username: 'you@example.com',
  password: 'k7#Lm-92qX!t',
  notes: 'Family plan',
};

describe('item encryption', () => {
  it('round-trips item data', () => {
    const blob = encryptItemData(sodium, vaultKey, 'item-1', netflix);
    expect(decryptItemData(sodium, vaultKey, 'item-1', blob)).toEqual(netflix);
  });

  it('does not leak plaintext into the blob', () => {
    const blob = encryptItemData(sodium, vaultKey, 'item-1', netflix);
    expect(JSON.stringify(blob)).not.toContain('Netflix');
  });

  it('rejects a ciphertext moved to another item id', () => {
    const blob = encryptItemData(sodium, vaultKey, 'item-1', netflix);
    expect(() => decryptItemData(sodium, vaultKey, 'item-2', blob)).toThrow(DecryptionError);
  });

  it('rejects decrypted data with an unexpected structure', () => {
    const partial = { name: 'Netflix' } as unknown as VaultItemData;
    const blob = encryptItemData(sodium, vaultKey, 'item-1', partial);
    expect(() => decryptItemData(sodium, vaultKey, 'item-1', blob)).toThrow(InvalidFormatError);
  });
});
