import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUnlockedSession } from '../../session/SessionContext';

const DEVICES_QUERY_KEY = ['devices'] as const;

export function useDevices() {
  const { api } = useUnlockedSession();
  return useQuery({ queryKey: DEVICES_QUERY_KEY, queryFn: () => api.listDevices() });
}

export function useRevokeDevice() {
  const { api } = useUnlockedSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeDevice(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: DEVICES_QUERY_KEY }),
  });
}

/** Each call issues a fresh one-time pairing token (valid for 5 minutes). */
export function useCreatePairingToken() {
  const { api } = useUnlockedSession();
  return useMutation({ mutationFn: () => api.createPairingToken() });
}
