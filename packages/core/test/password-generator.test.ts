import { describe, expect, it } from 'vitest';
import { generatePassword } from '../src/index';
import { sodium } from './support/sodium';

describe('generatePassword', () => {
  it('has the requested length and every character class', () => {
    for (let i = 0; i < 50; i++) {
      const password = generatePassword(sodium, 12);
      expect(password).toHaveLength(12);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[2-9]/);
      expect(password).toMatch(/[!#$%&*+\-=?@^_~]/);
    }
  });

  it('avoids look-alike characters', () => {
    const many = Array.from({ length: 50 }, () => generatePassword(sodium)).join('');
    expect(many).not.toMatch(/[lIO01]/);
  });

  it('does not repeat', () => {
    expect(generatePassword(sodium)).not.toBe(generatePassword(sodium));
  });

  it('rejects lengths too short for all classes', () => {
    expect(() => generatePassword(sodium, 3)).toThrow(RangeError);
  });
});
