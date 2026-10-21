import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fillLoginForm, probeFrame } from './page-scripts';

const credentials = { username: 'you@example.com', password: 'k7#Lm-92qX!t' };
const field = (selector: string) => document.querySelector<HTMLInputElement>(selector)?.value;

describe('fillLoginForm', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('fills username and password of a regular login form', () => {
    document.body.innerHTML = `
      <form><input name="q" type="search"></form>
      <form>
        <input name="login" type="text">
        <input name="pass" type="password">
      </form>`;

    expect(fillLoginForm(credentials)).toEqual({ username: true, password: true });
    expect(field('[name=login]')).toBe(credentials.username);
    expect(field('[name=pass]')).toBe(credentials.password);
    expect(field('[name=q]')).toBe('');
  });

  it('prefers the field marked as username', () => {
    document.body.innerHTML = `
      <input id="first-name" type="text">
      <input id="u" type="text" autocomplete="username">
      <input id="p" type="password">`;

    fillLoginForm(credentials);

    expect(field('#u')).toBe(credentials.username);
    expect(field('#first-name')).toBe('');
  });

  it('fills only the username on a username-first step', () => {
    document.body.innerHTML = '<input id="e" type="email"><button>Next</button>';

    expect(fillLoginForm(credentials)).toEqual({ username: true, password: false });
    expect(field('#e')).toBe(credentials.username);
  });

  it('ignores hidden and disabled fields', () => {
    document.body.innerHTML = `
      <div style="display:none"><input id="trap-user" type="text"><input id="trap" type="password"></div>
      <input id="ro" type="password" readonly>
      <input id="u" type="text"><input id="p" type="password">`;

    fillLoginForm(credentials);

    expect(field('#trap')).toBe('');
    expect(field('#trap-user')).toBe('');
    expect(field('#ro')).toBe('');
    expect(field('#p')).toBe(credentials.password);
  });

  it('notifies frameworks through input events', () => {
    document.body.innerHTML = '<input id="u" type="text"><input id="p" type="password">';
    const onInput = vi.fn();
    document.querySelector('#p')?.addEventListener('input', onInput);

    fillLoginForm(credentials);

    expect(onInput).toHaveBeenCalled();
  });

  it('does nothing without a login form', () => {
    document.body.innerHTML = '<input id="q" type="search">';

    expect(fillLoginForm(credentials)).toEqual({ username: false, password: false });
  });
});

describe('probeFrame', () => {
  it('reports a login form without receiving credentials', () => {
    document.body.innerHTML = '<input type="password">';
    expect(probeFrame()).toMatchObject({ hasLoginForm: true });
  });
});
