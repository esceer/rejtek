import { useRef, type ComponentRef, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';
import { createStyles, useTheme } from '../theme/useTheme';

/**
 * Label + input inside a Group row; `trailing` holds e.g. a generate button.
 * The whole row focuses the input, not just the text line.
 */
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
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <View style={styles.row}>
      <Pressable style={styles.main} accessible={false} onPress={() => inputRef.current?.focus()}>
        <Text style={[styles.label, error !== undefined && { color: theme.colors.danger }]}>
          {error ?? label}
        </Text>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, mono && styles.mono]}
          {...input}
        />
      </Pressable>
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
