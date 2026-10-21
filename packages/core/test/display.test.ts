import { describe, expect, it } from 'vitest';
import { avatarLetter, avatarTint, displayHost, formatRelative, safeHref } from '../src/index';

describe('safeHref', () => {
  it.each([
    ['https://netflix.com', 'https://netflix.com'],
    ['netflix.com', 'https://netflix.com'],
    ['accounts.google.com/login', 'https://accounts.google.com/login'],
    ['javascript:alert(1)', null],
    ['data:text/html,x', null],
    ['just some text', null],
  ])('%s → %s', (url, expected) => {
    expect(safeHref(url)).toBe(expected);
  });
});

describe('displayHost', () => {
  it('shows the host without www', () => {
    expect(displayHost('https://www.netflix.com/browse')).toBe('netflix.com');
  });
});

describe('avatars', () => {
  it('uses a stable colour per name', () => {
    expect(avatarTint('Netflix')).toBe(avatarTint('netflix'));
  });

  it('takes the first code point', () => {
    expect(avatarLetter(' árvíz')).toBe('Á');
    expect(avatarLetter('')).toBe('?');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-10-21T12:00:00Z');

  it.each([
    ['2026-10-21T11:59:30Z', 'just now'],
    ['2026-10-21T11:59:00Z', '1 minute ago'],
    ['2026-10-21T09:00:00Z', '3 hours ago'],
    ['2026-10-19T12:00:00Z', '2 days ago'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });
});
