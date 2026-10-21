import type { Sodium } from '../crypto/sodium';
import { decryptItemData } from '../vault/item-crypto';
import type { EncryptedVaultItem } from '../vault/item';

/** A device-side item plus the server version it was last synced with (0 = never). */
export interface LocalSyncItem {
  readonly item: EncryptedVaultItem;
  readonly syncedVersion: number;
}

export type DiffKind =
  /** Exists only here (new on the phone, or deleted on the server long ago and pruned). */
  | 'local-only'
  /** Exists only on the server. */
  | 'server-only'
  /** Changed here since the last sync; the server copy is unchanged. */
  | 'changed-local'
  /** Changed on the server since the last sync; the local copy is unchanged. */
  | 'changed-server'
  /** Changed on both sides since the last sync. */
  | 'changed-both'
  /** Deleted here, still present on the server. */
  | 'deleted-local'
  /** Deleted on the server, still present here. */
  | 'deleted-server';

export interface SyncDifference {
  readonly id: string;
  readonly kind: DiffKind;
  /** Decrypted item name for display (never the password). */
  readonly name: string;
  readonly local: LocalSyncItem | undefined;
  readonly server: EncryptedVaultItem | undefined;
}

/**
 * Compares the device's items with the server's. Items that match, or that are deleted on
 * both sides, produce no difference. Passwords are never exposed: only names are decrypted.
 */
export function diffVaults(
  sodium: Sodium,
  vaultKey: Uint8Array,
  localItems: readonly LocalSyncItem[],
  serverItems: readonly EncryptedVaultItem[],
): SyncDifference[] {
  const serverById = new Map(serverItems.map((item) => [item.id, item]));
  const localById = new Map(localItems.map((entry) => [entry.item.id, entry]));
  const ids = new Set([...localById.keys(), ...serverById.keys()]);

  const differences: SyncDifference[] = [];
  for (const id of ids) {
    const local = localById.get(id);
    const server = serverById.get(id);
    const kind = classify(local, server);
    if (kind) {
      differences.push({ id, kind, name: nameOf(sodium, vaultKey, local, server), local, server });
    }
  }
  return differences.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

function classify(
  local: LocalSyncItem | undefined,
  server: EncryptedVaultItem | undefined,
): DiffKind | null {
  const localLive = local !== undefined && !local.item.deleted;
  const serverLive = server !== undefined && !server.deleted;

  if (!local) {
    return serverLive ? 'server-only' : null;
  }
  if (!server) {
    return localLive ? 'local-only' : null;
  }
  if (!localLive && !serverLive) {
    return null;
  }

  const localChanged = local.item.version > local.syncedVersion;
  const serverChanged = server.version !== local.syncedVersion;
  if (!localLive) {
    return serverChanged ? 'changed-both' : 'deleted-local';
  }
  if (!serverLive) {
    return localChanged ? 'changed-both' : 'deleted-server';
  }
  if (localChanged && serverChanged) {
    return 'changed-both';
  }
  if (localChanged) {
    return 'changed-local';
  }
  if (serverChanged) {
    return 'changed-server';
  }
  return null;
}

function nameOf(
  sodium: Sodium,
  vaultKey: Uint8Array,
  local: LocalSyncItem | undefined,
  server: EncryptedVaultItem | undefined,
): string {
  for (const item of [local?.item, server]) {
    if (item && !item.deleted) {
      try {
        return decryptItemData(sodium, vaultKey, item.id, item.data).name;
      } catch {
        // Try the other side; fall through to a placeholder if neither decrypts.
      }
    }
  }
  return 'Unnamed item';
}
