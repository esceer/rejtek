import PinnedFetch from '../../modules/pinned-fetch';

const TIMEOUT_MS = 5_000;

/**
 * A `fetch` that only talks to the server whose certificate fingerprint was pinned during
 * pairing. Plugs into `createApiClient({ fetch })` from @rejtek/core.
 */
export function createPinnedFetch(fingerprint: string): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, name) => {
      headers[name] = value;
    });
    const response = await PinnedFetch.request({
      url,
      method: init?.method ?? 'GET',
      headers,
      body: typeof init?.body === 'string' ? init.body : null,
      fingerprint,
      timeoutMs: TIMEOUT_MS,
    });
    return new Response(response.body === '' ? null : response.body, { status: response.status });
  };
}

/** True when the server presented a different certificate than the one paired with. */
export function isCertificateMismatch(error: unknown): boolean {
  for (let current: unknown = error; current instanceof Error; current = current.cause) {
    if ((current as Error & { code?: string }).code === 'ERR_CERT_MISMATCH') {
      return true;
    }
  }
  return false;
}
