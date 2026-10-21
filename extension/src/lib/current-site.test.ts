import type { DecryptedVaultItem } from '@rejtek/core';
import { describe, expect, it } from 'vitest';
import { itemsForSite, siteOf } from './current-site';

const item = (id: string, url: string): DecryptedVaultItem => ({
  id,
  version: 1,
  updatedAt: '2026-10-21T12:00:00Z',
  data: { name: id, url, username: '', password: '', notes: '' },
});

describe('siteOf', () => {
  it.each([
    ['www.netflix.com', 'netflix.com'],
    ['accounts.google.com', 'google.com'],
    ['netflix.com.', 'netflix.com'],
    ['192.168.1.20', null],
    ['localhost', null],
  ])('%s → %s', (host, site) => {
    expect(siteOf(host)).toBe(site);
  });
});

describe('itemsForSite', () => {
  const items = [
    item('netflix', 'netflix.com'),
    item('netflix-login', 'https://www.netflix.com/login'),
    item('spotify', 'https://open.spotify.com'),
    item('no-url', ''),
  ];

  it('matches subdomains of the same site in both directions', () => {
    expect(itemsForSite(items, 'www.netflix.com').map((i) => i.id)).toEqual([
      'netflix',
      'netflix-login',
    ]);
  });

  it('matches nothing for IP addresses', () => {
    expect(itemsForSite(items, '10.0.0.1')).toEqual([]);
  });
});
