import type { Sodium } from '@rejtek/core';

let loading: Promise<Sodium> | undefined;

/** Loads and initialises libsodium (WebAssembly) once, on first use. */
export function loadSodium(): Promise<Sodium> {
  loading ??= import('libsodium-wrappers-sumo').then(async ({ default: sodium }) => {
    await sodium.ready;
    return sodium;
  });
  return loading;
}
