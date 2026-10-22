import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Pressable, Text, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { serverHost } from '../server/server-config';
import { useServer } from '../server/ServerProvider';
import { createStyles } from '../theme/useTheme';
import { Group, GroupDivider } from '../ui/Group';
import { PillButton } from '../ui/PillButton';
import { Screen } from '../ui/Screen';
import { useUnlockedVault } from '../vault/VaultProvider';

export default function SettingsScreen() {
  const styles = useStyles();
  const { config, disconnect } = useServer();
  const { store } = useUnlockedVault();
  const queryClient = useQueryClient();
  const { t, language, setLanguage } = useI18n();

  const confirmDisconnect = () => {
    Alert.alert(t.settings.disconnectTitle, t.settings.disconnectText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.disconnect,
        style: 'destructive',
        onPress: () =>
          void disconnect()
            .then(() => store.resetSyncState())
            .then(() => queryClient.invalidateQueries()),
      },
    ]);
  };

  return (
    <Screen
      onBack={router.back}
      title={t.settings.title}
      headerRight={
        // Shows the language it switches to.
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.settings.switchLanguage}
          onPress={() => {
            setLanguage(language === 'en' ? 'hu' : 'en');
          }}
          style={styles.flag}
        >
          <Text style={styles.flagText}>{language === 'en' ? '🇭🇺' : '🇬🇧'}</Text>
        </Pressable>
      }
    >
      <Text style={styles.section}>{t.settings.homeServer}</Text>
      {config ? (
        <>
          <Group>
            <Row label={t.fields.server} value={serverHost(config)} />
            <GroupDivider />
            <Row label={t.settings.account} value={config.username} />
            <GroupDivider />
            <Row label={t.fields.certificate} value={config.fingerprint ?? t.settings.none} mono />
          </Group>
          <View style={styles.actions}>
            <PillButton
              label={t.settings.disconnect}
              variant="secondary"
              onPress={confirmDisconnect}
            />
          </View>
        </>
      ) : (
        <>
          <Group>
            <View style={styles.row}>
              <Text style={styles.text}>{t.settings.notConnected}</Text>
            </View>
          </Group>
          <View style={styles.actions}>
            <PillButton
              label={t.settings.connect}
              icon="qrcode-scan"
              onPress={() => {
                router.push('/pair/scan');
              }}
            />
          </View>
        </>
      )}

      <Text style={styles.section}>{t.settings.security}</Text>
      <Group>
        <Row label={t.settings.unlock} value={t.settings.unlockValue} />
        <GroupDivider />
        <Row label={t.settings.autoLock} value={t.settings.autoLockValue} />
      </Group>
    </Screen>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={mono ? styles.mono : styles.value}>{value}</Text>
    </View>
  );
}

const useStyles = createStyles((t) => ({
  section: {
    paddingHorizontal: 8,
    paddingTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: t.colors.muted,
  },
  row: { paddingHorizontal: 18, paddingVertical: 12 },
  label: { fontSize: 13, color: t.colors.muted },
  value: { marginTop: 2, fontSize: 16, fontWeight: '500', color: t.colors.ink },
  mono: { marginTop: 4, fontFamily: 'monospace', fontSize: 12, color: t.colors.ink },
  text: { fontSize: 15, lineHeight: 22, color: t.colors.ink },
  actions: { flexDirection: 'row' },
  flag: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  flagText: { fontSize: 24 },
}));
