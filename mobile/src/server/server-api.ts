import { createApiClient, type ApiClient } from '@rejtek/core';
import { createPinnedFetch } from './pinned-fetch';

/** API client for a server: certificate-pinned when a fingerprint is known. */
export function createServerApi(
  url: string,
  fingerprint: string | null,
  getToken?: () => string | null,
): ApiClient {
  return createApiClient({
    baseUrl: url,
    ...(getToken ? { getToken } : {}),
    ...(fingerprint ? { fetch: createPinnedFetch(fingerprint) } : {}),
  });
}
