import { describe, expect, it } from 'vitest';
import { avatarLetter, avatarTint, displayHost, safeHref } from '../src/index';

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
