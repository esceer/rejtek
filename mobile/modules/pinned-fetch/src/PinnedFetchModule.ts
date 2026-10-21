import { NativeModule, requireNativeModule } from 'expo';

export interface PinnedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  /** SHA-256 certificate fingerprint, colon-separated hex. */
  fingerprint: string;
  timeoutMs: number;
}

export interface PinnedResponse {
  status: number;
  body: string;
}

declare class PinnedFetchModule extends NativeModule {
  /**
   * Rejects with code `ERR_CERT_MISMATCH` if the server presents a different certificate,
   * or `ERR_NETWORK` if it cannot be reached.
   */
  request(options: PinnedRequest): Promise<PinnedResponse>;
}

export default requireNativeModule<PinnedFetchModule>('PinnedFetch');
