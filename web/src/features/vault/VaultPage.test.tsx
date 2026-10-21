import {
  decryptItemData,
  encryptItemData,
  generateVaultKey,
  type EncryptedVaultItem,
  type PutItemRequest,
  type UnlockedSession,
  type VaultItemData,
} from '@rejtek/core';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { loadSodium } from '../../lib/sodium';
import { renderWithProviders } from '../../test/render';
import { VaultPage } from './VaultPage';

const sodium = await loadSodium();
const vaultKey = generateVaultKey(sodium);
const session: UnlockedSession = {
  username: 'roland',
  token: 'tok',
  expiresAt: '2026-10-22T00:00:00Z',
  vaultKey,
};

function encrypted(id: string, data: Partial<VaultItemData>): EncryptedVaultItem {
  const full = { name: '', url: '', username: '', password: '', notes: '', ...data };
  return {
    id,
    version: 1,
    updatedAt: '2026-10-21T12:00:00Z',
    deleted: false,
    data: encryptItemData(sodium, vaultKey, id, full),
  };
}

const items = [
  encrypted('1', { name: 'Netflix', username: 'you@example.com', password: 'k7#Lm-92qX!t' }),
  encrypted('2', { name: 'Spotify', username: 'you@example.com', password: 'other' }),
];

describe('VaultPage', () => {
  it('filters while typing and reveals a password only on request', async () => {
    renderWithProviders(<VaultPage />, { listItems: () => Promise.resolve(items) }, session);

    await userEvent.type(await screen.findByLabelText('Search vault'), 'netf');
    expect(screen.getByText('1 of 2 match')).toBeInTheDocument();
    expect(screen.queryByText('Spotify')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Netflix/ }));
    expect(screen.queryByText('k7#Lm-92qX!t')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Reveal' }));
    expect(screen.getByText('k7#Lm-92qX!t')).toBeInTheDocument();
  });

  it('encrypts a new item before sending it to the server', async () => {
    const putItem = vi.fn((id: string, request: PutItemRequest) =>
      Promise.resolve({
        id,
        version: 1,
        updatedAt: request.updatedAt,
        deleted: false as const,
        data: request.data,
      }),
    );
    renderWithProviders(
      <VaultPage />,
      { listItems: () => Promise.resolve(items), putItem },
      session,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'New item' }));
    const form = screen.getByRole('heading', { name: 'New item' }).closest('form');
    if (!form) throw new Error('form not found');
    await userEvent.type(within(form).getByLabelText('Name'), 'Disney+');
    await userEvent.type(within(form).getByLabelText('Password'), 'secret-pw');
    await userEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(putItem).toHaveBeenCalledOnce();
    const [id, request] = putItem.mock.calls[0] ?? [];
    if (!id || !request) throw new Error('putItem was not called with arguments');
    expect(request.baseVersion).toBe(0);
    expect(JSON.stringify(request)).not.toContain('secret-pw');
    expect(decryptItemData(sodium, vaultKey, id, request.data)).toMatchObject({
      name: 'Disney+',
      password: 'secret-pw',
    });
  });
});
