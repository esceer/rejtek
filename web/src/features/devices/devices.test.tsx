import type { Device, UnlockedSession } from '@rejtek/core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { DevicesPage } from './DevicesPage';
import { PairPage } from './PairPage';

const session: UnlockedSession = {
  username: 'roland',
  token: 'tok',
  expiresAt: '2026-10-22T00:00:00Z',
  vaultKey: new Uint8Array(32),
};

const phone: Device = {
  id: 'd1',
  name: 'OnePlus 15',
  kind: 'phone',
  createdAt: '2026-10-02T10:00:00Z',
  lastUsedAt: '2026-10-19T21:40:00Z',
};

describe('DevicesPage', () => {
  it('revokes a device after confirmation', async () => {
    const revokeDevice = vi.fn(() => Promise.resolve(undefined));
    renderWithProviders(
      <DevicesPage />,
      { listDevices: () => Promise.resolve([phone]), revokeDevice },
      session,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Revoke' }));
    expect(revokeDevice).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, revoke' }));

    expect(revokeDevice).toHaveBeenCalledWith('d1');
  });
});

describe('PairPage', () => {
  it('shows a QR code with its expiry and the certificate fingerprint', async () => {
    const createPairingToken = vi.fn(() =>
      Promise.resolve({
        token: 'pairing-token',
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        certificateFingerprint: '3F:9A:62',
      }),
    );
    renderWithProviders(<PairPage />, { createPairingToken }, session);

    expect(await screen.findByRole('img', { name: 'Pairing QR code' })).toBeInTheDocument();
    expect(screen.getByText(/Expires in/)).toHaveTextContent(/[45]:\d\d/);
    expect(screen.getByText('3F:9A:62')).toBeInTheDocument();
  });
});
