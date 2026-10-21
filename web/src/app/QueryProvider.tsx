import { ApiError } from '@rejtek/core';
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useSession } from '../session/SessionContext';

/** TanStack Query setup: an expired or revoked session (401) signs the user out everywhere. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { session, clear } = useSession();

  // `clear` is stable for the provider's lifetime, so capturing it once is safe.
  const [queryClient] = useState(() => {
    const onError = (error: Error) => {
      if (error instanceof ApiError && error.status === 401) {
        clear();
      }
    };
    return new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
  });

  // Decrypted vault data is cached in memory; drop it as soon as the session ends.
  useEffect(() => {
    if (!session) {
      queryClient.clear();
    }
  }, [session, queryClient]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
