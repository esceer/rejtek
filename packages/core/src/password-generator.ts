import type { Sodium } from './crypto/sodium';

const CLASSES = [
  'abcdefghijkmnopqrstuvwxyz', // no l: easily confused with 1/I
  'ABCDEFGHJKLMNPQRSTUVWXYZ', // no I, O
  '23456789', // no 0, 1
  '!#$%&*+-=?@^_~',
] as const;

export const DEFAULT_PASSWORD_LENGTH = 16;

/** Random password containing at least one character of every class. */
export function generatePassword(sodium: Sodium, length = DEFAULT_PASSWORD_LENGTH): string {
  if (length < CLASSES.length) {
    throw new RangeError(`Length must be at least ${String(CLASSES.length)}`);
  }
  const alphabet = CLASSES.join('');
  for (;;) {
    const password = Array.from(
      { length },
      () => alphabet[randomIndex(sodium, alphabet.length)],
    ).join('');
    if (CLASSES.every((chars) => Array.from(chars).some((c) => password.includes(c)))) {
      return password;
    }
  }
}

/** Uniform index in [0, size) via rejection sampling, so no character is more likely than another. */
function randomIndex(sodium: Sodium, size: number): number {
  const limit = 256 - (256 % size);
  for (;;) {
    const [byte = 0] = sodium.randombytes_buf(1);
    if (byte < limit) {
      return byte % size;
    }
  }
}
