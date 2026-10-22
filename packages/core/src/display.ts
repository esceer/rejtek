// Presentation helpers shared by the web and mobile apps.

/** Only http(s) links are opened; anything else (e.g. `javascript:`) is treated as plain text. */
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

/** Date and time in the given locale (default: the runtime's). */
export function formatDate(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

// Dark enough for white text in light and dark themes.
const AVATAR_TINTS = [
  '#B45309',
  '#0F766E',
  '#374151',
  '#B91C1C',
  '#4338CA',
  '#9F1239',
  '#15803D',
  '#1E3A8A',
] as const;

/** Stable avatar colour for an item name. */
export function avatarTint(name: string): string {
  let hash = 0;
  for (const char of name.toLowerCase()) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length] ?? AVATAR_TINTS[2];
}

/** First character (code point) of a name, upper-cased, for avatars. */
export function avatarLetter(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?';
}

/** Compact English relative time, e.g. "just now", "5 minutes ago", "2 days ago". */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  const units: [number, string][] = [
    [86_400, 'day'],
    [3_600, 'hour'],
    [60, 'minute'],
  ];
  for (const [size, unit] of units) {
    if (seconds >= size) {
      const value = Math.floor(seconds / size);
      return `${String(value)} ${unit}${value === 1 ? '' : 's'} ago`;
    }
  }
  return 'just now';
}
