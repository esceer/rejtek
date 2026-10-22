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
import { useI18n } from '../../i18n/I18nProvider';
import type { Messages } from '../../i18n/en';
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
  const { t } = useI18n();
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
      <Screen onBack={router.back} title={t.pairing.notACodeTitle}>
        <Text style={styles.muted}>{t.pairing.notACodeText}</Text>
      </Screen>
    );
  }
  return <ConfirmForm payload={payload} />;
}

function ConfirmForm({ payload }: { payload: PairingPayload }) {
  const styles = useStyles();
  const { t } = useI18n();
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
      title={t.pairing.title}
      subtitle={t.pairing.subtitle(paired?.username)}
      footer={
        <PillButton
          label={pair.isPending ? t.pairing.connecting : t.pairing.connect}
          disabled={pair.isPending || password === ''}
          onPress={() => {
            pair.mutate();
          }}
        />
      }
    >
      <Group>
        <View style={styles.row}>
          <Text style={styles.label}>{t.fields.server}</Text>
          <Text style={styles.value}>{serverHost(payload)}</Text>
        </View>
        <GroupDivider />
        <View style={styles.row}>
          <Text style={styles.label}>{t.fields.certificate}</Text>
          <Text style={styles.mono}>{payload.fingerprint ?? t.pairing.developmentServer}</Text>
        </View>
      </Group>

      <Group>
        <FormField
          label={t.fields.masterPassword}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          error={
            pair.isError ? pairingErrorMessage(t, pair.error, paired !== undefined) : undefined
          }
        />
      </Group>

      {itemCount > 0 && (
        <View style={styles.info}>
          <Text style={styles.infoText}>{t.pairing.existingItems(itemCount)}</Text>
        </View>
      )}
    </Screen>
  );
}

function pairingErrorMessage(t: Messages, error: unknown, alreadyPaired: boolean): string {
  if (error instanceof DecryptionError) {
    return t.pairing.wrongPassword;
  }
  if (error instanceof ServerUnreachableError) {
    return isCertificateMismatch(error) ? t.pairing.certificateMismatch : t.pairing.unreachable;
  }
  if (!alreadyPaired && error instanceof ApiError && error.status === 401) {
    return t.pairing.expired;
  }
  return t.common.somethingWrong;
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
