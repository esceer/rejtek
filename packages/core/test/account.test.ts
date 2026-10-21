import { describe, expect, it } from 'vitest';
import {
  ApiError,
  createAccount,
  DecryptionError,
  signIn,
  type ApiClient,
  type RegisterRequest,
} from '../src/index.js';
import { FAST_KDF, sodium } from './support/sodium.js';

/** Minimal in-memory stand-in for the server's auth endpoints. */
function fakeServer() {
  let registered: RegisterRequest | undefined;
  const api = {
    register: (request: RegisterRequest) => {
      registered = request;
      return Promise.resolve(undefined);
    },
    prelogin: () =>
      registered
        ? Promise.resolve({ salt: registered.salt, kdf: registered.kdf })
        : Promise.reject(new ApiError(404, undefined)),
    login: (_username: string, authKey: string) =>
      registered?.authKey === authKey
        ? Promise.resolve({
            token: 'tok',
            expiresAt: '2026-10-22T00:00:00Z',
            wrappedVaultKey: registered.wrappedVaultKey,
          })
        : Promise.reject(new ApiError(401, undefined)),
  } as unknown as ApiClient;
  return { api, registered: () => registered };
}

describe('createAccount / signIn', () => {
  it('signs in with the master password used at registration', async () => {
    const server = fakeServer();
    await createAccount(sodium, server.api, 'roland', 'correct horse', FAST_KDF);

    const session = await signIn(sodium, server.api, 'roland', 'correct horse');

    expect(session.token).toBe('tok');
    expect(session.vaultKey).toHaveLength(32);
  });

  it('never sends the master password to the server', async () => {
    const server = fakeServer();
    await createAccount(sodium, server.api, 'roland', 'correct horse', FAST_KDF);

    expect(JSON.stringify(server.registered())).not.toContain('correct horse');
  });

  it('is rejected by the server with a wrong master password', async () => {
    const server = fakeServer();
    await createAccount(sodium, server.api, 'roland', 'correct horse', FAST_KDF);

    await expect(signIn(sodium, server.api, 'roland', 'wrong')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('cannot unwrap the vault key with a different password even if login succeeded', async () => {
    const server = fakeServer();
    await createAccount(sodium, server.api, 'roland', 'correct horse', FAST_KDF);
    const login = server.api.login.bind(server.api);
    const tricked = {
      ...server.api,
      login: () => login('roland', server.registered()?.authKey ?? ''),
    } as ApiClient;

    await expect(signIn(sodium, tricked, 'roland', 'wrong')).rejects.toBeInstanceOf(
      DecryptionError,
    );
  });
});
