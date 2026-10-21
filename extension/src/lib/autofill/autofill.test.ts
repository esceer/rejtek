import type { DecryptedVaultItem } from '@rejtek/core';
import { describe, expect, it } from 'vitest';
import { installFakeBrowser } from '../../test/fake-browser';
import { fillInActiveTab } from './autofill';

const netflix: DecryptedVaultItem = {
  id: 'n',
  version: 1,
  updatedAt: '2026-10-21T12:00:00Z',
  data: {
    name: 'Netflix',
    url: 'netflix.com',
    username: 'you@example.com',
    password: 'k7#Lm-92qX!t',
    notes: '',
  },
};

const probe = (frameId: number, hostname: string, hasLoginForm: boolean, protocol = 'https:') => ({
  frameId,
  result: { hostname, protocol, hasLoginForm },
});

describe('fillInActiveTab', () => {
  it('refuses a login saved for another site without touching the page', async () => {
    const browserFake = installFakeBrowser('https://www.spotify.com/login');

    expect(await fillInActiveTab(netflix)).toBe('other-site');
    expect(browserFake.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('refuses to fill an https login into an http page', async () => {
    const browserFake = installFakeBrowser('http://www.netflix.com/login');

    expect(await fillInActiveTab(netflix)).toBe('insecure-page');
    expect(browserFake.scripting.executeScript).not.toHaveBeenCalled();
  });

  it('sends the credentials only to the matching frame with a login form', async () => {
    const browserFake = installFakeBrowser('https://www.netflix.com/login');
    browserFake.scripting.executeScript
      .mockResolvedValueOnce([
        probe(0, 'www.netflix.com', false),
        probe(3, 'ads.example.com', true),
        probe(5, 'auth.netflix.com', true),
      ])
      .mockResolvedValueOnce([{ frameId: 5, result: { username: true, password: true } }]);

    expect(await fillInActiveTab(netflix)).toBe('filled');

    const fillCall = browserFake.scripting.executeScript.mock.calls[1]?.[0];
    expect(fillCall).toMatchObject({
      target: { tabId: 7, frameIds: [5] },
      args: [{ username: 'you@example.com', password: 'k7#Lm-92qX!t' }],
    });
    // The probe never receives credentials.
    expect(browserFake.scripting.executeScript.mock.calls[0]?.[0]).not.toHaveProperty('args');
  });

  it('reports pages without a login form and sends nothing', async () => {
    const browserFake = installFakeBrowser('https://www.netflix.com/browse');
    browserFake.scripting.executeScript.mockResolvedValueOnce([probe(0, 'www.netflix.com', false)]);

    expect(await fillInActiveTab(netflix)).toBe('no-login-form');
    expect(browserFake.scripting.executeScript).toHaveBeenCalledTimes(1);
  });

  it('reports pages Firefox does not allow scripts on', async () => {
    const browserFake = installFakeBrowser('https://addons.mozilla.org/netflix.com');
    browserFake.scripting.executeScript.mockRejectedValueOnce(new Error('Missing host permission'));

    expect(
      await fillInActiveTab({ ...netflix, data: { ...netflix.data, url: 'mozilla.org' } }),
    ).toBe('not-allowed');
  });
});
