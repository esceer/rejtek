import type { Sodium } from '@rejtek/core';
import * as libsodium from 'react-native-libsodium';

let loading: Promise<Sodium> | undefined;

/** Native libsodium (JSI), initialised once. */
export function loadSodium(): Promise<Sodium> {
  loading ??= libsodium.ready.then(() => libsodium);
  return loading;
}
