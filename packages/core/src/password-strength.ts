export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export const PASSWORD_STRENGTH_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/**
 * Rough entropy estimate (length × log2 of the character pool). Intentionally simple:
 * it guides users towards long passphrases, it does not detect dictionary words.
 */
export function estimatePasswordStrength(password: string): PasswordStrength {
  const chars = Array.from(password); // code points, not UTF-16 units
  let pool = 0;
  if (chars.some((c) => /[a-z]/.test(c))) pool += 26;
  if (chars.some((c) => /[A-Z]/.test(c))) pool += 26;
  if (chars.some((c) => /[0-9]/.test(c))) pool += 10;
  if (chars.some((c) => /[ -/:-@[-`{-~]/.test(c))) pool += 33;
  if (chars.some((c) => c.charCodeAt(0) > 127)) pool += 100;

  const bits = chars.length * Math.log2(Math.max(pool, 1));
  if (bits < 28) return 0;
  if (bits < 36) return 1;
  if (bits < 60) return 2;
  if (bits < 80) return 3;
  return 4;
}
