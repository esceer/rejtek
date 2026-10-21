import { describe, expect, it } from 'vitest';
import {
  encodePairingPayload,
  InvalidFormatError,
  parsePairingPayload,
  type PairingPayload,
} from '../src/index.js';

const payload: PairingPayload = {
  v: 1,
  url: 'https://192.168.1.20:8443',
  token: 'abc',
  fingerprint: '3F:9A',
};

describe('pairing payload', () => {
  it('round-trips', () => {
    expect(parsePairingPayload(encodePairingPayload(payload))).toEqual(payload);
  });

  it.each([
    'not json',
    '{}',
    JSON.stringify({ ...payload, v: 2 }),
    JSON.stringify({ ...payload, url: 'ftp://x' }),
    JSON.stringify({ ...payload, token: '' }),
  ])('rejects %s', (text) => {
    expect(() => parsePairingPayload(text)).toThrow(InvalidFormatError);
  });
});
