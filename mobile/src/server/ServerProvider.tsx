import type { ApiClient } from '@rejtek/core';
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createServerApi } from './server-api';
import {
  clearServerConfig,
  loadServerConfig,
  saveServerConfig,
  type ServerConfig,
} from './server-config';

interface ServerContextValue {
  /** undefined while loading, null when this phone is not paired. */
  readonly config: ServerConfig | null | undefined;
  readonly api: ApiClient | null;
  readonly connect: (config: ServerConfig) => Promise<void>;
  readonly disconnect: () => Promise<void>;
}

const ServerContext = createContext<ServerContextValue | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ServerConfig | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    loadServerConfig().then(
      (loaded) => {
        if (active) setConfig(loaded);
      },
      () => {
        if (active) setConfig(null);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const api = useMemo(
    () =>
      config ? createServerApi(config.url, config.fingerprint, () => config.deviceToken) : null,
    [config],
  );

  const connect = useCallback(async (next: ServerConfig) => {
    await saveServerConfig(next);
    setConfig(next);
  }, []);

  const disconnect = useCallback(async () => {
    // Best effort: also revoke this device on the server if it is reachable.
    if (api && config) {
      await api.revokeDevice(config.deviceId).catch(() => undefined);
    }
    await clearServerConfig();
    setConfig(null);
  }, [api, config]);

  const value = useMemo(
    () => ({ config, api, connect, disconnect }),
    [config, api, connect, disconnect],
  );
  return <ServerContext value={value}>{children}</ServerContext>;
}

export function useServer(): ServerContextValue {
  const value = use(ServerContext);
  if (!value) {
    throw new Error('useServer must be used inside <ServerProvider>');
  }
  return value;
}
