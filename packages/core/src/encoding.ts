// Uses only APIs available in browsers, Node and Hermes (React Native).

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export function utf8Encode(value: string): Uint8Array {
  // Copy into this realm's Uint8Array: some environments (e.g. jsdom) hand back a foreign-realm
  // array that libsodium's `instanceof` check rejects.
  return Uint8Array.from(new TextEncoder().encode(value));
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
