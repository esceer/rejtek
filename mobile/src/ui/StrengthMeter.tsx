import { estimatePasswordStrength } from '@rejtek/core';
import { Text, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { createStyles, useTheme } from '../theme/useTheme';

export function StrengthMeter({ password }: { password: string }) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useI18n();
  const strength = estimatePasswordStrength(password);
  const filled = password ? Math.max(strength, 1) : 0;
  const color =
    strength >= 3 ? theme.colors.ok : strength === 2 ? theme.colors.warn : theme.colors.danger;
  return (
    <View style={styles.root}>
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[styles.bar, { backgroundColor: bar > filled ? theme.colors.field : color }]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {password
          ? `${t.strength.labels[strength] ?? ''} · ${t.strength.characters(Array.from(password).length)}`
          : ' '}
      </Text>
    </View>
  );
}

const useStyles = createStyles((t) => ({
  root: { paddingHorizontal: 18, paddingBottom: 14 },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  label: { marginTop: 8, fontSize: 12, color: t.colors.muted },
}));
