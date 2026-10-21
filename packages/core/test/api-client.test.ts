import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, ServerUnreachableError } from '../src/index';

function fakeFetch(status: number, body?: unknown) {
  return vi.fn<typeof fetch>(() =>
    Promise.resolve(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  );
}

describe('createApiClient', () => {
  it('sends JSON with the bearer token and parses the response', async () => {
    const fetch = fakeFetch(200, [{ id: 'a' }]);
    const api = createApiClient({ baseUrl: 'https://srv', getToken: () => 'tok', fetch });

    await expect(api.listItems()).resolves.toEqual([{ id: 'a' }]);

    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('https://srv/api/vault/items');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer tok');
  });

  it('serialises request bodies', async () => {
    const fetch = fakeFetch(200, {});
    const api = createApiClient({ baseUrl: '', fetch });

    await api.login('roland', 'key');

    const init = fetch.mock.calls[0]?.[1];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ username: 'roland', authKey: 'key' });
  });

  it('returns undefined for empty responses', async () => {
    const api = createApiClient({ baseUrl: '', fetch: fakeFetch(204) });

    await expect(api.logout()).resolves.toBeUndefined();
  });

  it('throws ApiError with status and body on failure', async () => {
    const api = createApiClient({ baseUrl: '', fetch: fakeFetch(409, { current: null }) });

    const error = await api
      .putItem('x', { baseVersion: 1, updatedAt: '', data: {} as never })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, body: { current: null } });
  });

  it('throws ServerUnreachableError when the request cannot be made', async () => {
    const failing = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch')));
    const api = createApiClient({ baseUrl: '', fetch: failing });

    await expect(api.listItems()).rejects.toBeInstanceOf(ServerUnreachableError);
  });
});
