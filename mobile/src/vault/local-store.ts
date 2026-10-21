import type { EncryptedBlob, EncryptedVaultItem } from '@rejtek/core';
import * as SQLite from 'expo-sqlite';

/** An item as stored on this device, plus what is needed to sync it later. */
export interface LocalItem {
  readonly item: EncryptedVaultItem;
  /** Server version this row was last synced with; 0 = never synced. */
  readonly syncedVersion: number;
}

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
];

/**
 * Encrypted vault items on the device. Stores ciphertext only; the vault key lives in
 * the Android Keystore (see vault-key.ts). Local edits bump `version`; an item has
 * unsynced changes while `version > syncedVersion`.
 */
export class LocalVaultStore {
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
