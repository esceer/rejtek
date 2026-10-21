// Wire types of the Rejtek server API (JSON, camelCase). Binary values are Base64.
import type { EncryptedBlob } from '../crypto/aead';
import type { KdfParams } from '../crypto/kdf';
import type { EncryptedVaultItem } from '../vault/item';

export interface PreloginResponse {
  readonly salt: string;
  readonly kdf: KdfParams;
}

export interface RegisterRequest {
  readonly username: string;
  readonly salt: string;
  readonly kdf: KdfParams;
  readonly authKey: string;
  readonly wrappedVaultKey: EncryptedBlob;
}

export interface LoginResponse {
  readonly token: string;
  readonly expiresAt: string;
  readonly wrappedVaultKey: EncryptedBlob;
}

export interface PairingTokenResponse {
  readonly token: string;
  readonly expiresAt: string;
  readonly certificateFingerprint: string | null;
}

export type DeviceKind = 'phone' | 'extension';

export interface PairRequest {
  readonly pairingToken: string;
  readonly name: string;
  readonly kind: DeviceKind;
}

export interface PairResponse {
  readonly deviceId: string;
  readonly deviceToken: string;
  readonly username: string;
  readonly salt: string;
  readonly kdf: KdfParams;
  readonly wrappedVaultKey: EncryptedBlob;
}

export interface Device {
  readonly id: string;
  readonly name: string;
  readonly kind: DeviceKind;
  readonly createdAt: string;
  readonly lastUsedAt: string;
}

export interface PutItemRequest {
  /** Server version the client last saw; 0 for a new item. */
  readonly baseVersion: number;
  readonly updatedAt: string;
  readonly data: EncryptedBlob;
}

export interface VersionConflict {
  readonly current: EncryptedVaultItem | null;
}
