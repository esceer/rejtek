import { InvalidFormatError } from './errors.js';

/** Contents of the pairing QR code shown by the web UI and scanned by a device. */
export interface PairingPayload {
  readonly v: 1;
  /** Server origin, e.g. `https://192.168.1.20:8443`. */
  readonly url: string;
  /** One-time pairing token. */
  readonly token: string;
  /** SHA-256 certificate fingerprint the device pins; null if the server runs without TLS (dev). */
  readonly fingerprint: string | null;
}

export function encodePairingPayload(payload: PairingPayload): string {
  return JSON.stringify(payload);
}

/** @throws {InvalidFormatError} if the scanned text is not a Rejtek pairing code. */
export function parsePairingPayload(text: string): PairingPayload {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (cause) {
    throw new InvalidFormatError('Not a Rejtek pairing code', { cause });
  }
  if (!isPairingPayload(value)) {
    throw new InvalidFormatError('Not a Rejtek pairing code');
  }
  return value;
}

function isPairingPayload(value: unknown): value is PairingPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.v === 1 &&
    typeof record.url === 'string' &&
    /^https?:\/\//.test(record.url) &&
    typeof record.token === 'string' &&
    record.token.length > 0 &&
    (record.fingerprint === null || typeof record.fingerprint === 'string')
  );
}
