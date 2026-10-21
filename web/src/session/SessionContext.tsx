import { createApiClient, type ApiClient, type UnlockedSession } from '@rejtek/core';
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

interface SessionContextValue {
  /** Null while signed out. Holds the vault key, so it lives in memory only. */
  readonly session: UnlockedSession | null;
  readonly api: ApiClient;
  readonly start: (session: UnlockedSession) => void;
  /** Forgets the session locally (e.g. after the server rejected the token). */
  readonly clear: () => void;
  /** Revokes the session on the server, then forgets it. */
  readonly signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
  children,
  createApi = createApiClient,
  initialSession = null,
}: {
  children: ReactNode;
  /** Injectable for tests. */
  createApi?: typeof createApiClient;
  /** Injectable for tests. */
  initialSession?: UnlockedSession | null;
}) {
  const [session, setSession] = useState<UnlockedSession | null>(initialSession);
  const token = session?.token ?? null;
  const api = useMemo(() => createApi({ baseUrl: '', getToken: () => token }), [createApi, token]);

  const start = useCallback((next: UnlockedSession) => {
    setSession(next);
  }, []);

  const clear = useCallback(() => {
    setSession(null);
  }, []);

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    clear();
  }, [api, clear]);

  const value = useMemo(
    () => ({ session, api, start, clear, signOut }),
    [session, api, start, clear, signOut],
  );
  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionContextValue {
  const value = use(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return value;
}

/** For pages behind <RequireSession>: the session is guaranteed to exist. */
export function useUnlockedSession(): SessionContextValue & { session: UnlockedSession } {
  const value = useSession();
  if (!value.session) {
    throw new Error('useUnlockedSession used without an active session');
  }
  return value as SessionContextValue & { session: UnlockedSession };
}
