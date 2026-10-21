import { fromBase64, toBase64, utf8Decode, utf8Encode } from './encoding';
import { InvalidFormatError } from './errors';

/** Deep link prefix, so scanning the code with the system camera opens the app. */
const LINK_PREFIX = 'rejtek://pair?p=';

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

/** Encodes the payload as a `rejtek://pair?p=<base64url JSON>` link. */
export function encodePairingPayload(payload: PairingPayload): string {
  const base64 = toBase64(utf8Encode(JSON.stringify(payload)));
  return LINK_PREFIX + base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Accepts the deep link (or the bare `p` value, or raw JSON).
 * @throws {InvalidFormatError} if the text is not a Rejtek pairing code.
 */
export function parsePairingPayload(text: string): PairingPayload {
  let value: unknown;
  try {
    value = JSON.parse(decodeLink(text.trim()));
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

function decodeLink(text: string): string {
  if (text.startsWith('{')) {
    return text;
  }
  const encoded = text.startsWith(LINK_PREFIX) ? text.slice(LINK_PREFIX.length) : text;
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  return utf8Decode(fromBase64(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
}
