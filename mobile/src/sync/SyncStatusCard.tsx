import { formatRelative } from '@rejtek/core';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { serverHost, type ServerConfig } from '../server/server-config';
import { createStyles } from '../theme/useTheme';
import { useLastSync } from './useSync';

/** "Paired with … · Synced 2 days ago · [Sync now]" card on the vault screen. */
export function SyncStatusCard({ config }: { config: ServerConfig }) {
  const styles = useStyles();
  const lastSync = useLastSync();
  return (
    <View style={styles.card}>
      <View style={styles.dot} />
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          Paired with {serverHost(config)}
        </Text>
        <Text style={styles.subtitle}>
          {lastSync.data ? `Synced ${formatRelative(lastSync.data)}` : 'Not synced yet'}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          router.push('/sync');
        }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Sync now</Text>
      </Pressable>
    </View>
  );
}

const useStyles = createStyles((t) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 12,
    borderRadius: 22,
    backgroundColor: t.colors.card,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.ok },
  text: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: t.colors.ink },
  subtitle: { fontSize: 13, color: t.colors.muted },
  button: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: t.colors.accentTint,
  },
  buttonText: { fontSize: 15, fontWeight: '600', color: t.colors.accent },
}));
