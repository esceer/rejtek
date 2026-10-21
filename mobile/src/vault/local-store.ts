import type {
  EncryptedBlob,
  EncryptedVaultItem,
  LocalSyncItem,
  LocalSyncStore,
} from '@rejtek/core';
import * as SQLite from 'expo-sqlite';

/** An item as stored on this device, plus the server version it was last synced with. */
export type LocalItem = LocalSyncItem;

interface ItemRow {
  id: string;
  version: number;
  updated_at: string;
  deleted: number;
  data: string | null;
  synced_version: number;
}

// Each entry migrates the schema one version up (PRAGMA user_version).
const MIGRATIONS = [
  `CREATE TABLE items (
     id TEXT PRIMARY KEY NOT NULL,
     version INTEGER NOT NULL,
     updated_at TEXT NOT NULL,
     deleted INTEGER NOT NULL DEFAULT 0,
     data TEXT,
     synced_version INTEGER NOT NULL DEFAULT 0
   );`,
  `CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
];

/**
 * Encrypted vault items on the device. Stores ciphertext only; the vault key lives in
 * the Android Keystore (see vault-key.ts). Local edits bump `version`; an item has
 * unsynced changes while `version > syncedVersion`.
 */
export class LocalVaultStore implements LocalSyncStore {
  private constructor(private readonly db: SQLite.SQLiteDatabase) {}

  static async open(name = 'vault.db'): Promise<LocalVaultStore> {
    const db = await SQLite.openDatabaseAsync(name);
    await migrate(db);
    return new LocalVaultStore(db);
  }

  async list(): Promise<LocalItem[]> {
    const rows = await this.db.getAllAsync<ItemRow>('SELECT * FROM items');
    return rows.map(toLocalItem);
  }

  async count(): Promise<number> {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM items');
    return row?.n ?? 0;
  }

  /** Creates or updates an item with newly encrypted data. */
  async save(id: string, data: EncryptedBlob, updatedAt: string): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO items (id, version, updated_at, deleted, data, synced_version)
       VALUES (?, 1, ?, 0, ?, 0)
       ON CONFLICT(id) DO UPDATE SET
         version = version + 1, updated_at = excluded.updated_at, deleted = 0, data = excluded.data`,
      id,
      updatedAt,
      JSON.stringify(data),
    );
  }

  /** Never-synced items are removed outright; synced ones keep a tombstone for the next sync. */
  async remove(id: string, updatedAt: string): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM items WHERE id = ? AND synced_version = 0', id);
      await txn.runAsync(
        `UPDATE items SET version = version + 1, updated_at = ?, deleted = 1, data = NULL
         WHERE id = ?`,
        updatedAt,
        id,
      );
    });
  }

  // --- Sync (see @rejtek/core › sync) ---

  async applyServerItem(item: EncryptedVaultItem): Promise<void> {
    if (item.deleted) {
      await this.db.runAsync('DELETE FROM items WHERE id = ?', item.id);
      return;
    }
    await this.db.runAsync(
      `INSERT INTO items (id, version, updated_at, deleted, data, synced_version)
       VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         version = excluded.version, updated_at = excluded.updated_at, deleted = 0,
         data = excluded.data, synced_version = excluded.synced_version`,
      item.id,
      item.version,
      item.updatedAt,
      JSON.stringify(item.data),
      item.version,
    );
  }

  async markSynced(id: string, version: number): Promise<void> {
    await this.db.runAsync(
      'UPDATE items SET version = ?, synced_version = ? WHERE id = ?',
      version,
      version,
      id,
    );
  }

  async forget(id: string): Promise<void> {
    await this.db.runAsync('DELETE FROM items WHERE id = ?', id);
  }

  /** After disconnecting from a server: everything counts as never synced again. */
  async resetSyncState(): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      await txn.runAsync('DELETE FROM items WHERE deleted = 1');
      await txn.runAsync('UPDATE items SET synced_version = 0');
    });
  }

  // --- Vault key change (pairing) ---

  async firstLiveItem(): Promise<EncryptedVaultItem | null> {
    const row = await this.db.getFirstAsync<ItemRow>(
      'SELECT * FROM items WHERE deleted = 0 LIMIT 1',
    );
    return row ? toLocalItem(row).item : null;
  }

  /** Re-encrypts every live item in one transaction (all or nothing). */
  async reencryptAll(transform: (id: string, data: EncryptedBlob) => EncryptedBlob): Promise<void> {
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      const rows = await txn.getAllAsync<ItemRow>('SELECT * FROM items WHERE deleted = 0');
      for (const row of rows) {
        if (row.data !== null) {
          const data = transform(row.id, JSON.parse(row.data) as EncryptedBlob);
          await txn.runAsync(
            'UPDATE items SET data = ? WHERE id = ?',
            JSON.stringify(data),
            row.id,
          );
        }
      }
    });
  }

  // --- Settings (non-secret preferences and sync metadata) ---

  async getSetting(key: string): Promise<string | null> {
    const row = await this.db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      key,
    );
    return row?.value ?? null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await this.db.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      value,
    );
  }
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(MIGRATIONS[version] ?? '');
      await txn.execAsync(`PRAGMA user_version = ${String(version + 1)}`);
    });
  }
}

function toLocalItem(row: ItemRow): LocalItem {
  const meta = { id: row.id, version: row.version, updatedAt: row.updated_at };
  const item: EncryptedVaultItem =
    row.deleted || row.data === null
      ? { ...meta, deleted: true, data: null }
      : { ...meta, deleted: false, data: JSON.parse(row.data) as EncryptedBlob };
  return { item, syncedVersion: row.synced_version };
}
