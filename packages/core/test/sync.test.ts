import { describe, expect, it } from 'vitest';
import {
  ApiError,
  diffVaults,
  encryptItemData,
  generateVaultKey,
  pullAll,
  pushAll,
  pushItem,
  type EncryptedVaultItem,
  type LocalSyncItem,
  type LocalSyncStore,
  type PutItemRequest,
} from '../src/index';
import { sodium } from './support/sodium';

const vaultKey = generateVaultKey(sodium);
const NOW = '2026-10-21T12:00:00Z';

function live(id: string, name: string, version: number): EncryptedVaultItem {
  const data = { name, url: '', username: '', password: `${name}-pw`, notes: '' };
  return {
    id,
    version,
    updatedAt: NOW,
    deleted: false,
    data: encryptItemData(sodium, vaultKey, id, data),
  };
}

function tombstone(id: string, version: number): EncryptedVaultItem {
  return { id, version, updatedAt: NOW, deleted: true, data: null };
}

/** In-memory server with the real optimistic-concurrency rule. */
class FakeServer {
  readonly items = new Map<string, EncryptedVaultItem>();

  constructor(items: EncryptedVaultItem[]) {
    items.forEach((item) => this.items.set(item.id, item));
  }

  putItem = (id: string, request: PutItemRequest): Promise<EncryptedVaultItem> => {
    const current = this.items.get(id);
    if ((current?.version ?? 0) !== request.baseVersion) {
      return Promise.reject(new ApiError(409, { current: current ?? null }));
    }
    const saved: EncryptedVaultItem = {
      id,
      version: request.baseVersion + 1,
      updatedAt: request.updatedAt,
      deleted: false,
      data: request.data,
    };
    this.items.set(id, saved);
    return Promise.resolve(saved);
  };

  deleteItem = (id: string, baseVersion: number): Promise<EncryptedVaultItem> => {
    const current = this.items.get(id);
    if (current?.version !== baseVersion) {
      return Promise.reject(new ApiError(409, { current: current ?? null }));
    }
    const saved = tombstone(id, baseVersion + 1);
    this.items.set(id, saved);
    return Promise.resolve(saved);
  };

  list = () => [...this.items.values()];
}

/** In-memory device storage mirroring the SQLite store's semantics. */
class FakeDevice implements LocalSyncStore {
  readonly items = new Map<string, LocalSyncItem>();

  constructor(items: LocalSyncItem[]) {
    items.forEach((entry) => this.items.set(entry.item.id, entry));
  }

  applyServerItem(item: EncryptedVaultItem): Promise<void> {
    if (item.deleted) {
      this.items.delete(item.id);
    } else {
      this.items.set(item.id, { item, syncedVersion: item.version });
    }
    return Promise.resolve();
  }

  markSynced(id: string, version: number): Promise<void> {
    const entry = this.items.get(id);
    if (entry) {
      this.items.set(id, { item: { ...entry.item, version }, syncedVersion: version });
    }
    return Promise.resolve();
  }

  forget(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }

  list = () => [...this.items.values()];
}

const diff = (device: FakeDevice, server: FakeServer) =>
  diffVaults(sodium, vaultKey, device.list(), server.list());

/** One scenario per difference kind, plus items that are in sync. */
function scenario() {
  const server = new FakeServer([
    live('same', 'Same', 3),
    live('server-only', 'Server only', 1),
    live('changed-local', 'Changed here', 2),
    live('changed-server', 'Changed there', 5),
    live('changed-both', 'Changed both', 4),
    live('deleted-local', 'Deleted here', 2),
    tombstone('deleted-server', 3),
    tombstone('gone-everywhere', 2),
  ]);
  const device = new FakeDevice([
    { item: live('same', 'Same', 3), syncedVersion: 3 },
    { item: live('local-only', 'Local only', 1), syncedVersion: 0 },
    { item: live('changed-local', 'Changed here', 3), syncedVersion: 2 },
    { item: live('changed-server', 'Changed there', 4), syncedVersion: 4 },
    { item: live('changed-both', 'Changed both', 3), syncedVersion: 2 },
    { item: tombstone('deleted-local', 3), syncedVersion: 2 },
    { item: live('deleted-server', 'Deleted there', 2), syncedVersion: 2 },
  ]);
  return { server, device };
}

describe('diffVaults', () => {
  it('classifies every kind of difference and ignores items in sync', () => {
    const { server, device } = scenario();

    const kinds = Object.fromEntries(diff(device, server).map((d) => [d.id, d.kind]));

    expect(kinds).toEqual({
      'local-only': 'local-only',
      'server-only': 'server-only',
      'changed-local': 'changed-local',
      'changed-server': 'changed-server',
      'changed-both': 'changed-both',
      'deleted-local': 'deleted-local',
      'deleted-server': 'deleted-server',
    });
  });

  it('shows names but never passwords', () => {
    const { server, device } = scenario();

    const differences = diff(device, server);

    expect(differences.find((d) => d.id === 'deleted-local')?.name).toBe('Deleted here');
    expect(JSON.stringify(differences.map((d) => [d.id, d.kind, d.name]))).not.toContain('-pw');
  });
});

describe('pushAll / pullAll', () => {
  it('push all makes the device win, keeping server-only items', async () => {
    const { server, device } = scenario();

    await pushAll(server, device, diff(device, server));

    expect(diff(device, server).map((d) => d.kind)).toEqual(['server-only']);
    expect(server.items.get('deleted-local')?.deleted).toBe(true);
    expect(server.items.get('deleted-server')?.deleted).toBe(false);
  });

  it('pull all makes the server win, keeping phone-only items', async () => {
    const { server, device } = scenario();

    await pullAll(device, diff(device, server));

    expect(diff(device, server).map((d) => d.kind)).toEqual(['local-only']);
    expect(device.items.has('deleted-server')).toBe(false);
    expect(device.items.get('deleted-local')?.item.deleted).toBe(false);
  });

  it('refuses to overwrite a server change made after the diff', async () => {
    const { server, device } = scenario();
    const stale = diff(device, server).find((d) => d.id === 'changed-local');
    const elsewhere = live('changed-local', 'Changed elsewhere', 3);
    if (!stale || elsewhere.deleted) throw new Error('unexpected fixture');
    await server.putItem('changed-local', { baseVersion: 2, updatedAt: NOW, data: elsewhere.data });

    await expect(pushItem(server, device, stale)).rejects.toMatchObject({ status: 409 });
  });
});
