import sodium from 'libsodium-wrappers-sumo';
import type { KdfParams } from '../../src/index.js';

await sodium.ready;

export { sodium };

/** Minimal Argon2id cost to keep tests fast. Never use outside tests. */
export const FAST_KDF: KdfParams = {
  algorithm: 'argon2id',
  opsLimit: 1,
  memLimitBytes: 8 * 1024 * 1024,
};
