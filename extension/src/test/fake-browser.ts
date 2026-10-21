import { vi } from 'vitest';

/** In-memory stand-in for a browser.storage area. */
function fakeStorageArea() {
  let data: Record<string, unknown> = {};
  const keysOf = (keys: string | string[]) => (typeof keys === 'string' ? [keys] : keys);
  return {
    get: (keys: string | string[]) =>
      Promise.resolve(
        Object.fromEntries(
          keysOf(keys)
            .filter((k) => k in data)
            .map((k) => [k, data[k]]),
        ),
      ),
    set: (items: Record<string, unknown>) => {
      data = { ...data, ...items };
      return Promise.resolve();
    },
    remove: (keys: string | string[]) => {
      keysOf(keys).forEach((k) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- test double
        delete data[k];
      });
      return Promise.resolve();
    },
    clear: () => {
      data = {};
      return Promise.resolve();
    },
  };
}

/** The parts of Firefox's `browser` API the extension uses. */
export function createFakeBrowser(activeTabUrl = 'https://www.netflix.com/browse') {
  return {
    storage: { local: fakeStorageArea(), session: fakeStorageArea() },
    alarms: { create: vi.fn(), onAlarm: { addListener: vi.fn() } },
    permissions: { request: vi.fn(() => Promise.resolve(true)) },
    runtime: { getPlatformInfo: () => Promise.resolve({ os: 'mac' }) },
    tabs: {
      query: () => Promise.resolve([{ id: 7, url: activeTabUrl }]),
      create: vi.fn(),
    },
    scripting: {
      executeScript: vi.fn<
        (injection: unknown) => Promise<{ frameId: number; result?: unknown }[]>
      >(() => Promise.resolve([])),
    },
  };
}

export function installFakeBrowser(activeTabUrl?: string) {
  const fake = createFakeBrowser(activeTabUrl);
  globalThis.browser = fake as unknown as typeof browser;
  return fake;
}
