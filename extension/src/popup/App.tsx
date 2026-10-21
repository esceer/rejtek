import { createApiClient } from '@rejtek/core';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { extensionStorage } from '../lib/storage';
import { ConnectView } from './views/ConnectView';
import { LockedView } from './views/LockedView';
import { VaultView } from './views/VaultView';

export type CreateApi = typeof createApiClient;
const STATUS_KEY = ['status'] as const;

export function App({ createApi = createApiClient }: { createApi?: CreateApi }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Popup createApi={createApi} />
    </QueryClientProvider>
  );
}

/** Not connected → connect; connected but locked → unlock; otherwise the vault. */
function Popup({ createApi }: { createApi: CreateApi }) {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: STATUS_KEY,
    queryFn: async () => ({
      connection: await extensionStorage.getConnection(),
      vaultKey: await extensionStorage.getVaultKey(),
    }),
  });
  const refresh = () => {
    // Everything else (decrypted items included) is derived from the status.
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== STATUS_KEY[0] });
    void queryClient.invalidateQueries({ queryKey: STATUS_KEY });
  };

  if (!status.data) {
    return null;
  }
  const { connection, vaultKey } = status.data;
  if (!connection) {
    return <ConnectView createApi={createApi} onConnected={refresh} />;
  }
  if (!vaultKey) {
    return <LockedView connection={connection} onUnlocked={refresh} />;
  }
  return (
    <VaultView
      connection={connection}
      vaultKey={vaultKey}
      api={createApi({ baseUrl: connection.url, getToken: () => connection.deviceToken })}
      onLocked={refresh}
    />
  );
}
