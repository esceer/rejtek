import {
  deriveMasterKeys,
  encodePairingPayload,
  encryptItemData,
  generateSalt,
  generateVaultKey,
  ServerUnreachableError,
  toBase64,
  wrapVaultKey,
  type ApiClient,
  type EncryptedVaultItem,
  type KdfParams,
  type PairResponse,
} from '@rejtek/core';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { loadSodium } from '../lib/sodium';
import { extensionStorage } from '../lib/storage';
import { App, type CreateApi } from './App';

const sodium = await loadSodium();
const FAST_KDF: KdfParams = { algorithm: 'argon2id', opsLimit: 1, memLimitBytes: 8 * 1024 * 1024 };
const MASTER = 'correct horse battery';
const vaultKey = generateVaultKey(sodium);
const salt = generateSalt(sodium);

const paired: PairResponse = {
  deviceId: 'device-1',
  deviceToken: 'device-token',
  username: 'roland',
  salt: toBase64(salt),
  kdf: FAST_KDF,
  wrappedVaultKey: wrapVaultKey(
    sodium,
    vaultKey,
    deriveMasterKeys(sodium, MASTER, salt, FAST_KDF).encryptionKey,
  ),
};

function encrypted(id: string, name: string, url: string): EncryptedVaultItem {
  const data = { name, url, username: 'you@example.com', password: `${name}-pw`, notes: '' };
  return {
    id,
    version: 1,
    updatedAt: '2026-10-21T12:00:00Z',
    deleted: false,
    data: encryptItemData(sodium, vaultKey, id, data),
  };
}

const serverItems = [
  encrypted('1', 'Netflix', 'netflix.com'),
  encrypted('2', 'Spotify', 'spotify.com'),
];

function fakeApi(overrides: Partial<ApiClient> = {}) {
  const api = {
    pair: vi.fn(() => Promise.resolve(paired)),
    listItems: vi.fn(() => Promise.resolve(serverItems)),
    revokeDevice: vi.fn(() => Promise.resolve(undefined)),
    ...overrides,
  };
  const createApi = vi.fn(() => api as unknown as ApiClient) as unknown as CreateApi;
  return { api, createApi };
}

describe('popup', () => {
  it('pairs, unlocks with the master password and suggests items for the open site', async () => {
    const { api, createApi } = fakeApi();
    render(<App createApi={createApi} />);
    const link = encodePairingPayload({
      v: 1,
      url: 'https://192.168.1.20:8443',
      token: 'one-time',
      fingerprint: 'AB:CD',
    });

    await userEvent.click(await screen.findByLabelText('Pairing link'));
    await userEvent.paste(link);
    await userEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(browser.permissions.request).toHaveBeenCalledWith({
      origins: ['https://192.168.1.20:8443/*'],
    });
    expect(api.pair).toHaveBeenCalledWith({
      pairingToken: 'one-time',
      name: 'Firefox on Mac',
      kind: 'extension',
    });

    await userEvent.type(await screen.findByLabelText('Master password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong master password.');

    await userEvent.clear(screen.getByLabelText('Master password'));
    await userEvent.type(screen.getByLabelText('Master password'), MASTER);
    await userEvent.click(screen.getByRole('button', { name: 'Unlock' }));

    expect(await screen.findByText('Suggested for www.netflix.com')).toBeInTheDocument();
    expect(screen.getAllByText('Netflix')).toHaveLength(2); // suggested + all items
    expect(screen.queryByText('Netflix-pw')).not.toBeInTheDocument();
    expect(await extensionStorage.getVaultKey()).toEqual(vaultKey);
  });

  it('shows the saved copy when the server is not reachable', async () => {
    await extensionStorage.setConnection({ url: 'https://192.168.1.20:8443', ...paired });
    await extensionStorage.setVaultKey(vaultKey);
    await extensionStorage.setItemsCache({ items: serverItems, savedAt: new Date().toISOString() });
    const { createApi } = fakeApi({
      listItems: () => Promise.reject(new ServerUnreachableError()),
    });

    render(<App createApi={createApi} />);

    expect(await screen.findByText(/Server not reachable/)).toBeInTheDocument();
    expect(screen.getAllByText('Spotify').length).toBeGreaterThan(0);
  });

  it('forgets the vault key when locked', async () => {
    await extensionStorage.setConnection({ url: 'https://192.168.1.20:8443', ...paired });
    await extensionStorage.setVaultKey(vaultKey);
    const { createApi } = fakeApi();
    render(<App createApi={createApi} />);

    await userEvent.click(await screen.findByRole('button', { name: 'Lock' }));

    expect(await screen.findByRole('heading', { name: 'Unlock' })).toBeInTheDocument();
    expect(await extensionStorage.getVaultKey()).toBeNull();
  });
});
