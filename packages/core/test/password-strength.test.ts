import { describe, expect, it } from 'vitest';
import { estimatePasswordStrength } from '../src/index.js';

describe('estimatePasswordStrength', () => {
  it.each([
    ['', 0],
    ['abc', 0],
    ['abc123', 1],
    ['password1', 2],
    ['Tr0ub4dor&3', 3],
    ['sunny-otter-kettle-42', 4],
    ['vR8$wq2!Lp#zN4ye', 4],
  ] as const)('%s → %i', (password, expected) => {
    expect(estimatePasswordStrength(password)).toBe(expected);
  });
});
