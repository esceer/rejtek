import { safeHref, type DecryptedVaultItem } from '@rejtek/core';

/** Host of the active tab when the popup opened (needs the activeTab permission), or null. */
export async function currentSiteHost(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  try {
    const url = new URL(tab?.url ?? '');
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.hostname : null;
  } catch {
    return null;
  }
}

/**
 * Items whose website belongs to the given host's site: `accounts.netflix.com` matches an
 * item saved as `netflix.com`, and vice versa.
 */
export function itemsForSite(
  items: readonly DecryptedVaultItem[],
  host: string,
): DecryptedVaultItem[] {
  const site = siteOf(host);
  if (!site) {
    return [];
  }
  return items.filter((item) => {
    const href = safeHref(item.data.url);
    return href !== null && siteOf(new URL(href).hostname) === site;
  });
}

/** Last two labels of a host name (`www.netflix.com` → `netflix.com`); null for IPs and single labels. */
export function siteOf(host: string): string | null {
  const labels = host.toLowerCase().replace(/\.$/, '').split('.');
  if (labels.length < 2 || /^\d+$/.test(labels.at(-1) ?? '')) {
    return null;
  }
  return labels.slice(-2).join('.');
}
