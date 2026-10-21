import { ApiError, ServerUnreachableError } from '@rejtek/core';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/render';
import { LoginPage } from './LoginPage';

const fastKdf = { algorithm: 'argon2id', opsLimit: 1, memLimitBytes: 8 * 1024 * 1024 } as const;
const salt = btoa('0123456789abcdef');

async function submit(username: string, password: string) {
  await userEvent.type(screen.getByLabelText('Username'), username);
  await userEvent.type(screen.getByLabelText('Master password'), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  it('shows a neutral message for a wrong password', async () => {
    renderWithProviders(<LoginPage />, {
      prelogin: () => Promise.resolve({ salt, kdf: fastKdf }),
      login: () => Promise.reject(new ApiError(401, undefined)),
    });

    await submit('roland', 'wrong password');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Wrong username or master password.',
    );
  });

  it('explains when the server is not reachable', async () => {
    renderWithProviders(<LoginPage />, {
      prelogin: () => Promise.reject(new ServerUnreachableError()),
    });

    await submit('roland', 'whatever');

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });
});
