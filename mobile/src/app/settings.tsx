import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, Text, View } from 'react-native';
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

  const confirmDisconnect = () => {
    Alert.alert(
      'Disconnect from server?',
      'Your passwords stay on this phone. Sync stops until you connect again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () =>
            void disconnect()
              .then(() => store.resetSyncState())
              .then(() => queryClient.invalidateQueries()),
        },
      ],
    );
  };

  return (
    <Screen onBack={router.back} title="Settings">
      <Text style={styles.section}>Home server</Text>
      {config ? (
        <>
          <Group>
            <Row label="Server" value={serverHost(config)} />
            <GroupDivider />
            <Row label="Account" value={config.username} />
            <GroupDivider />
            <Row label="Server certificate" value={config.fingerprint ?? 'none'} mono />
          </Group>
          <View style={styles.actions}>
            <PillButton label="Disconnect" variant="secondary" onPress={confirmDisconnect} />
          </View>
        </>
      ) : (
        <>
          <Group>
            <View style={styles.row}>
              <Text style={styles.text}>
                Not connected. Passwords live only on this phone. Connect to your home server to
                sync them with the web app and other devices.
              </Text>
            </View>
          </Group>
          <View style={styles.actions}>
            <PillButton
              label="Connect to server"
              icon="qrcode-scan"
              onPress={() => {
                router.push('/pair/scan');
              }}
            />
          </View>
        </>
      )}

      <Text style={styles.section}>Security</Text>
      <Group>
        <Row label="Unlock" value="Fingerprint or screen lock" />
        <GroupDivider />
        <Row label="Auto-lock" value="After 1 minute in the background" />
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
}));
