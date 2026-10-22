import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import type { Messages } from '../i18n/en';
import { createStyles, useTheme } from '../theme/useTheme';
import { PillButton } from '../ui/PillButton';
import { VaultKeyMissingError } from '../vault/vault-key';
import { useVault, type UnlockResult } from '../vault/VaultProvider';

type Status = 'idle' | 'busy' | Exclude<UnlockResult, 'unlocked'> | 'key-missing' | 'error';

const messagesFor = (t: Messages): Partial<Record<Status, string>> => ({
  'no-screen-lock': t.unlock.noScreenLock,
  'key-missing': t.unlock.keyMissing,
  error: t.unlock.error,
});

const statusOf = (result: UnlockResult): Status => (result === 'unlocked' ? 'idle' : result);
const statusOfError = (error: unknown): Status =>
  error instanceof VaultKeyMissingError ? 'key-missing' : 'error';

export default function UnlockScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { unlock } = useVault();
  const { t } = useI18n();
  // Starts busy: the system prompt opens right away, like in other password managers.
  const [status, setStatus] = useState<Status>('busy');

  useEffect(() => {
    let active = true;
    unlock().then(
      (result) => {
        if (active) setStatus(statusOf(result));
      },
      (error: unknown) => {
        if (active) setStatus(statusOfError(error));
      },
    );
    return () => {
      active = false;
    };
  }, [unlock]);

  const tryUnlock = () => {
    setStatus('busy');
    unlock().then(
      (result) => {
        setStatus(statusOf(result));
      },
      (error: unknown) => {
        setStatus(statusOfError(error));
      },
    );
  };

  const message = messagesFor(t)[status];

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 36 }]}>
      <View style={styles.center}>
        <View style={styles.lockBadge}>
          <MaterialCommunityIcons name="lock-outline" size={40} color={theme.colors.accent} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {t.unlock.title}
        </Text>
        <Text style={styles.text}>{message ?? t.unlock.text}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.unlock.withFingerprint}
        onPress={tryUnlock}
        style={styles.fingerprint}
      >
        <MaterialCommunityIcons name="fingerprint" size={48} color={theme.colors.accent} />
      </Pressable>
      <Text style={styles.hint}>{t.unlock.hint}</Text>

      <View style={styles.actions}>
        <PillButton
          label={status === 'busy' ? t.unlock.unlocking : t.unlock.unlock}
          disabled={status === 'busy'}
          onPress={tryUnlock}
        />
      </View>
    </View>
  );
}

const useStyles = createStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg, alignItems: 'center', paddingHorizontal: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lockBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accentTint,
  },
  title: { marginTop: 24, fontSize: 30, fontWeight: '700', color: t.colors.ink },
  text: { marginTop: 8, fontSize: 15, lineHeight: 22, textAlign: 'center', color: t.colors.muted },
  fingerprint: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.card,
  },
  hint: { marginTop: 14, fontSize: 14, color: t.colors.muted },
  actions: { flexDirection: 'row', width: '100%', marginTop: 40 },
}));
