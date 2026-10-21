import type { Sodium } from '@rejtek/core';

/** RFC 4122 version-4 UUID from libsodium's CSPRNG (Hermes has no crypto.randomUUID). */
export function newItemId(sodium: Sodium): string {
  const bytes = sodium.randombytes_buf(16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
