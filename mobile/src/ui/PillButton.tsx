import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, Text } from 'react-native';
import { createStyles, useTheme } from '../theme/useTheme';
import type { IconName } from './icons';

type Variant = 'primary' | 'secondary' | 'ghost';

export function PillButton({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const textColor =
    variant === 'primary'
      ? theme.colors.onAccent
      : variant === 'ghost'
        ? theme.colors.accent
        : theme.colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      {icon && <MaterialCommunityIcons name={icon} size={20} color={textColor} />}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = createStyles((t) => ({
  base: {
    flex: 1,
    minHeight: 54,
    borderRadius: 27,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primary: { backgroundColor: t.colors.accent },
  secondary: { backgroundColor: t.colors.field },
  ghost: { backgroundColor: 'transparent' },
  dimmed: { opacity: 0.7 },
  label: { fontSize: 16, fontWeight: '600' },
}));
