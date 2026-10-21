import {
  ApiError,
  DecryptionError,
  parsePairingPayload,
  ServerUnreachableError,
  type PairingPayload,
  type PairResponse,
} from '@rejtek/core';
import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { loadSodium } from '../../lib/sodium';
import { requestPairing, unlockAccountVaultKey } from '../../server/pairing';
import { isCertificateMismatch } from '../../server/pinned-fetch';
import { serverHost } from '../../server/server-config';
import { useServer } from '../../server/ServerProvider';
import { createStyles } from '../../theme/useTheme';
import { FormField } from '../../ui/FormField';
import { Group, GroupDivider } from '../../ui/Group';
import { PillButton } from '../../ui/PillButton';
import { Screen } from '../../ui/Screen';
import { useLocalItems } from '../../vault/useLocalVault';
import { useUnlockedVault } from '../../vault/VaultProvider';

export default function ConfirmPairingScreen() {
  const styles = useStyles();
  const { code } = useLocalSearchParams<{ code: string }>();
  const payload = useMemo(() => {
    try {
      return parsePairingPayload(code);
    } catch {
      return null;
    }
  }, [code]);

  if (!payload) {
    return (
      <Screen onBack={router.back} title="Not a pairing code">
        <Text style={styles.muted}>Scan the code shown on the Rejtek web page under Devices.</Text>
      </Screen>
    );
  }
  return <ConfirmForm payload={payload} />;
}

function ConfirmForm({ payload }: { payload: PairingPayload }) {
  const styles = useStyles();
  const { changeVaultKey } = useUnlockedVault();
  const { connect } = useServer();
  const localItems = useLocalItems();
  const [password, setPassword] = useState('');
  // Kept after the first attempt: the one-time code is used up, a wrong password can be retried.
  const [paired, setPaired] = useState<PairResponse>();

  const pair = useMutation({
    mutationFn: async () => {
      const response = paired ?? (await requestPairing(payload));
      setPaired(response);
      const accountKey = unlockAccountVaultKey(await loadSodium(), response, password);
      await changeVaultKey(accountKey);
      await connect({
        url: payload.url,
        fingerprint: payload.fingerprint,
        deviceId: response.deviceId,
        deviceToken: response.deviceToken,
        username: response.username,
      });
    },
    onSuccess: () => {
      router.replace('/sync');
    },
  });

  const itemCount = localItems.data?.length ?? 0;

  return (
    <Screen
      onBack={router.back}
      title="Almost done"
      subtitle={`Enter ${paired ? `${paired.username}’s` : 'your'} master password once. This phone keeps the key safely behind your screen lock.`}
      footer={
        <PillButton
          label={pair.isPending ? 'Connecting…' : 'Connect'}
          disabled={pair.isPending || password === ''}
          onPress={() => {
            pair.mutate();
          }}
        />
      }
    >
      <Group>
        <View style={styles.row}>
          <Text style={styles.label}>Server</Text>
          <Text style={styles.value}>{serverHost(payload)}</Text>
        </View>
        <GroupDivider />
        <View style={styles.row}>
          <Text style={styles.label}>Server certificate</Text>
          <Text style={styles.mono}>{payload.fingerprint ?? 'none (development server)'}</Text>
        </View>
      </Group>

      <Group>
        <FormField
          label="Master password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          error={pair.isError ? pairingErrorMessage(pair.error, paired !== undefined) : undefined}
        />
      </Group>

      {itemCount > 0 && (
        <View style={styles.info}>
          <Text style={styles.infoText}>
            {itemCount === 1
              ? 'The item already on this phone stays here. It will show up as “Only on phone” on your first sync.'
              : `The ${String(itemCount)} items already on this phone stay here. They will show up as “Only on phone” on your first sync.`}
          </Text>
        </View>
      )}
    </Screen>
  );
}

function pairingErrorMessage(error: unknown, alreadyPaired: boolean): string {
  if (error instanceof DecryptionError) {
    return 'Wrong master password';
  }
  if (error instanceof ServerUnreachableError) {
    return isCertificateMismatch(error)
      ? 'The server’s certificate does not match the code'
      : 'Cannot reach the server. Is the phone on the home Wi-Fi?';
  }
  if (!alreadyPaired && error instanceof ApiError && error.status === 401) {
    return 'This code expired or was already used. Create a new one on the web page.';
  }
  return 'Something went wrong. Please try again.';
}

const useStyles = createStyles((t) => ({
  row: { paddingHorizontal: 18, paddingVertical: 12 },
  label: { fontSize: 13, color: t.colors.muted },
  value: { marginTop: 2, fontSize: 16, fontWeight: '500', color: t.colors.ink },
  mono: { marginTop: 4, fontFamily: 'monospace', fontSize: 12, color: t.colors.ink },
  info: { borderRadius: 18, padding: 16, backgroundColor: t.colors.accentTint },
  infoText: { fontSize: 14, lineHeight: 21, color: t.colors.ink },
  muted: { paddingHorizontal: 8, fontSize: 15, color: t.colors.muted },
}));
