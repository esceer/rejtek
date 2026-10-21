import type { ReactNode } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { createStyles, useTheme } from '../theme/useTheme';

/** Label + input inside a Group row; `trailing` holds e.g. a generate button. */
export function FormField({
  label,
  error,
  trailing,
  mono = false,
  ...input
}: TextInputProps & {
  label: string;
  error?: string | undefined;
  trailing?: ReactNode;
  mono?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <Text style={[styles.label, error !== undefined && { color: theme.colors.danger }]}>
          {error ?? label}
        </Text>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, mono && styles.mono]}
          {...input}
        />
      </View>
      {trailing}
    </View>
  );
}

const useStyles = createStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 10,
  },
  main: { flex: 1 },
  label: { fontSize: 13, color: t.colors.muted },
  input: {
    fontSize: 16,
    fontWeight: '500',
    color: t.colors.ink,
    paddingVertical: 4,
    minHeight: 32,
  },
  mono: { fontFamily: 'monospace' },
}));
