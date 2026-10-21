// Small display helpers for vault items.

/** Only http(s) links are rendered; anything else (e.g. `javascript:`) is treated as text. */
export function safeHref(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

/** Host without `www.` for compact display, e.g. `netflix.com`. */
export function displayHost(url: string): string {
  const href = safeHref(url);
  if (!href) {
    return url;
  }
  try {
    return new URL(href).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
