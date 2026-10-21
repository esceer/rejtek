import type { EncryptedVaultItem } from '../vault/item.js';
import type {
  Device,
  LoginResponse,
  PairingTokenResponse,
  PairRequest,
  PairResponse,
  PreloginResponse,
  PutItemRequest,
  RegisterRequest,
} from './contracts.js';
import { ApiError, ServerUnreachableError } from './errors.js';

export interface ApiClientOptions {
  /** Server origin, e.g. `https://192.168.1.20:8443`; empty string for same-origin (web). */
  readonly baseUrl: string;
  readonly getToken?: () => string | null;
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5_000;

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = new Headers({ Accept: 'application/json' });
    const token = options.getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (body !== undefined) {
      headers.set('Content-Type', 'application/json');
    }

    let response: Response;
    try {
      response = await fetchImpl(`${options.baseUrl}${path}`, {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      });
    } catch (cause) {
      throw new ServerUnreachableError({ cause });
    }

    const text = await response.text();
    const json: unknown = text ? JSON.parse(text) : undefined;
    if (!response.ok) {
      throw new ApiError(response.status, json);
    }
    return json as T;
  }

  return {
    prelogin: (username: string) =>
      request<PreloginResponse>('POST', '/api/auth/prelogin', { username }),
    register: (registration: RegisterRequest) =>
      request<undefined>('POST', '/api/auth/register', registration),
    login: (username: string, authKey: string) =>
      request<LoginResponse>('POST', '/api/auth/login', { username, authKey }),
    logout: () => request<undefined>('POST', '/api/auth/logout'),

    createPairingToken: () => request<PairingTokenResponse>('POST', '/api/devices/pairing-tokens'),
    pair: (pairing: PairRequest) => request<PairResponse>('POST', '/api/devices/pair', pairing),
    listDevices: () => request<Device[]>('GET', '/api/devices'),
    revokeDevice: (id: string) =>
      request<undefined>('DELETE', `/api/devices/${encodeURIComponent(id)}`),

    listItems: () => request<EncryptedVaultItem[]>('GET', '/api/vault/items'),
    putItem: (id: string, item: PutItemRequest) =>
      request<EncryptedVaultItem>('PUT', `/api/vault/items/${encodeURIComponent(id)}`, item),
    deleteItem: (id: string, baseVersion: number) =>
      request<EncryptedVaultItem>(
        'DELETE',
        `/api/vault/items/${encodeURIComponent(id)}?baseVersion=${String(baseVersion)}`,
      ),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
