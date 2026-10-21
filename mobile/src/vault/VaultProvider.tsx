import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { loadSodium } from '../lib/sodium';
import { authenticateUser, hasScreenLock } from './device-auth';
import { LocalVaultStore } from './local-store';
import { loadOrCreateVaultKey } from './vault-key';

/** Lock again when the app was in the background longer than this. */
const AUTO_LOCK_AFTER_MS = 60_000;

export type UnlockResult = 'unlocked' | 'cancelled' | 'no-screen-lock';

interface VaultContextValue {
  readonly unlocked: { readonly vaultKey: Uint8Array; readonly store: LocalVaultStore } | null;
  readonly unlock: () => Promise<UnlockResult>;
  readonly lock: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [unlocked, setUnlocked] = useState<VaultContextValue['unlocked']>(null);

  const lock = useCallback(() => {
    setUnlocked(null);
    queryClient.clear(); // drops decrypted items from memory
  }, [queryClient]);

  const unlock = useCallback(async (): Promise<UnlockResult> => {
    if (!(await hasScreenLock())) {
      return 'no-screen-lock';
    }
    if (!(await authenticateUser())) {
      return 'cancelled';
    }
    const [sodium, store] = await Promise.all([loadSodium(), LocalVaultStore.open()]);
    const vaultKey = await loadOrCreateVaultKey(sodium, (await store.count()) > 0);
    setUnlocked({ vaultKey, store });
    return 'unlocked';
  }, []);

  useEffect(() => {
    let backgroundedAt: number | null = null;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt = Date.now();
      } else if (state === 'active' && backgroundedAt !== null) {
        if (Date.now() - backgroundedAt > AUTO_LOCK_AFTER_MS) {
          lock();
        }
        backgroundedAt = null;
      }
    });
    return () => {
      subscription.remove();
    };
  }, [lock]);

  const value = useMemo(() => ({ unlocked, unlock, lock }), [unlocked, unlock, lock]);
  return <VaultContext value={value}>{children}</VaultContext>;
}

export function useVault(): VaultContextValue {
  const value = use(VaultContext);
  if (!value) {
    throw new Error('useVault must be used inside <VaultProvider>');
  }
  return value;
}

/** For screens behind the unlock guard. */
export function useUnlockedVault() {
  const { unlocked, lock } = useVault();
  if (!unlocked) {
    throw new Error('Vault is locked');
  }
  return { ...unlocked, lock };
}
