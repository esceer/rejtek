import { describe, expect, it } from 'vitest';
import {
  encodePairingPayload,
  InvalidFormatError,
  parsePairingPayload,
  type PairingPayload,
} from '../src/index';

const payload: PairingPayload = {
  v: 1,
  url: 'https://192.168.1.20:8443',
  token: 'abc',
  fingerprint: '3F:9A',
};

describe('pairing payload', () => {
  it('round-trips through a rejtek:// deep link', () => {
    const link = encodePairingPayload(payload);

    expect(link).toMatch(/^rejtek:\/\/pair\?p=[A-Za-z0-9_-]+$/);
    expect(parsePairingPayload(link)).toEqual(payload);
  });

  it('accepts the bare link parameter and raw JSON', () => {
    const param = encodePairingPayload(payload).split('p=')[1] ?? '';

    expect(parsePairingPayload(param)).toEqual(payload);
    expect(parsePairingPayload(JSON.stringify(payload))).toEqual(payload);
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
