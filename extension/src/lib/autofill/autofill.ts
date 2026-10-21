import { safeHref, type DecryptedVaultItem } from '@rejtek/core';
import { siteOf } from '../current-site';
import { fillLoginForm, probeFrame, type FrameProbe } from './page-scripts';

export type FillOutcome =
  | 'filled'
  /** The page (or its matching frames) has no visible login fields. */
  | 'no-login-form'
  /** The login was saved for a different site than the open page. */
  | 'other-site'
  /** The page is plain http while the login was saved for https. */
  | 'insecure-page'
  /** Firefox refused script access (e.g. about: pages, the add-ons store). */
  | 'not-allowed';

/**
 * Fills `item` into the active tab. Credentials are only sent to one frame that belongs to the
 * item's site and has a login form; a first, credential-free probe picks that frame.
 */
export async function fillInActiveTab(item: DecryptedVaultItem): Promise<FillOutcome> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  const savedHref = safeHref(item.data.url);
  if (tab?.id === undefined || !tab.url || !savedHref) {
    return tab?.id === undefined ? 'not-allowed' : 'other-site';
  }
  const saved = new URL(savedHref);
  const site = siteOf(saved.hostname);
  const page = new URL(tab.url);
  if (site === null || siteOf(page.hostname) !== site) {
    return 'other-site';
  }
  if (!allowedProtocol(page.protocol, saved.protocol)) {
    return 'insecure-page';
  }

  let probes: { frameId: number; result?: unknown }[];
  try {
    probes = await browser.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: probeFrame,
    });
  } catch {
    return 'not-allowed';
  }

  const frame = probes
    .filter(({ result }) => {
      const probe = result as FrameProbe | undefined;
      return (
        probe?.hasLoginForm === true &&
        siteOf(probe.hostname) === site &&
        allowedProtocol(probe.protocol, saved.protocol)
      );
    })
    .sort((a, b) => (a.frameId === 0 ? -1 : b.frameId === 0 ? 1 : 0))[0];
  if (!frame) {
    return 'no-login-form';
  }

  const [filled] = await browser.scripting.executeScript({
    target: { tabId: tab.id, frameIds: [frame.frameId] },
    func: fillLoginForm,
    args: [{ username: item.data.username, password: item.data.password }],
  });
  const result = filled?.result as { username: boolean; password: boolean } | undefined;
  return result?.username || result?.password ? 'filled' : 'no-login-form';
}

/** https pages always; http pages only for logins that were saved as http. */
function allowedProtocol(page: string, saved: string): boolean {
  return page === 'https:' || (page === 'http:' && saved === 'http:');
}
