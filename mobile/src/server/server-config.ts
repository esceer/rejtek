import * as SecureStore from 'expo-secure-store';

/** How this phone reaches its home server. Stored in Keystore-backed SecureStore (has a token). */
export interface ServerConfig {
  readonly url: string;
  /** Pinned certificate fingerprint; null only for a dev server without TLS. */
  readonly fingerprint: string | null;
  readonly deviceId: string;
  readonly deviceToken: string;
  readonly username: string;
}

const CONFIG_KEY = 'rejtek.server.v1';
const STORE_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export async function loadServerConfig(): Promise<ServerConfig | null> {
  const stored = await SecureStore.getItemAsync(CONFIG_KEY);
  return stored ? (JSON.parse(stored) as ServerConfig) : null;
}

export async function saveServerConfig(config: ServerConfig): Promise<void> {
  await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config), STORE_OPTIONS);
}

export async function clearServerConfig(): Promise<void> {
  await SecureStore.deleteItemAsync(CONFIG_KEY);
}

/** e.g. `192.168.1.20` from `https://192.168.1.20:8443`. */
export function serverHost(config: Pick<ServerConfig, 'url'>): string {
  try {
    return new URL(config.url).hostname;
  } catch {
    return config.url;
  }
}
