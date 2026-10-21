import { describe, expect, it } from 'vitest';
import {
  decryptVault,
  encryptItemData,
  generateVaultKey,
  searchItems,
  type EncryptedVaultItem,
  type VaultItemData,
} from '../src/index.js';
import { sodium } from './support/sodium.js';

const vaultKey = generateVaultKey(sodium);

function item(id: string, data: Partial<VaultItemData>): EncryptedVaultItem {
  const full: VaultItemData = {
    name: '',
    url: '',
    username: '',
    password: 'pw',
    notes: '',
    ...data,
  };
  return {
    id,
    version: 1,
    updatedAt: '2026-10-21T12:00:00Z',
    deleted: false,
    data: encryptItemData(sodium, vaultKey, id, full),
  };
}

const encrypted: EncryptedVaultItem[] = [
  item('1', { name: 'Spotify', username: 'you@example.com' }),
  item('2', { name: 'netflix', url: 'https://netflix.com' }),
  item('3', { name: 'Árvíztűrő bank' }),
  { id: '4', version: 2, updatedAt: '2026-10-21T12:00:00Z', deleted: true, data: null },
];

describe('decryptVault', () => {
  it('decrypts live items sorted by name and skips tombstones', () => {
    const names = decryptVault(sodium, vaultKey, encrypted).map((i) => i.data.name);

    expect(names).toEqual(['Árvíztűrő bank', 'netflix', 'Spotify']);
  });
});

describe('searchItems', () => {
  const items = decryptVault(sodium, vaultKey, encrypted);
  const search = (query: string) => searchItems(items, query).map((i) => i.id);

  it('matches name prefixes case-insensitively', () => {
    expect(search('NETF')).toEqual(['2']);
  });

  it('ignores accents', () => {
    expect(search('arvizturo')).toEqual(['3']);
  });

  it('matches username and url', () => {
    expect(search('example.com')).toEqual(['1']);
    expect(search('netflix.com')).toEqual(['2']);
  });

  it('returns everything for an empty query', () => {
    expect(search('  ')).toHaveLength(3);
  });
});
