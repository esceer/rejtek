import {
  deriveMasterKeys,
  fromBase64,
  unwrapVaultKey,
  type PairingPayload,
  type PairResponse,
  type Sodium,
} from '@rejtek/core';
import { Platform } from 'react-native';
import { createServerApi } from './server-api';

/** Exchanges the one-time code from the QR for a device token. The code is used up either way. */
export function requestPairing(payload: PairingPayload): Promise<PairResponse> {
  return createServerApi(payload.url, payload.fingerprint).pair({
    pairingToken: payload.token,
    name: deviceName(),
    kind: 'phone',
  });
}

/**
 * Derives the account keys from the master password and unwraps the account's vault key.
 * @throws {DecryptionError} for a wrong master password.
 */
export function unlockAccountVaultKey(
  sodium: Sodium,
  paired: PairResponse,
  masterPassword: string,
): Uint8Array {
  const { encryptionKey } = deriveMasterKeys(
    sodium,
    masterPassword,
    fromBase64(paired.salt),
    paired.kdf,
  );
  return unwrapVaultKey(sodium, paired.wrappedVaultKey, encryptionKey);
}

/** Shown on the web Devices page, e.g. "OnePlus 15". */
function deviceName(): string {
  if (Platform.OS === 'android') {
    const { Manufacturer, Model } = Platform.constants;
    return Model.toLowerCase().startsWith(Manufacturer.toLowerCase())
      ? Model
      : `${Manufacturer} ${Model}`;
  }
  return 'iPhone';
}
