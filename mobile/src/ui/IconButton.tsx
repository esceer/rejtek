import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import type { Color } from '../theme/theme';
import { useTheme } from '../theme/useTheme';
import type { IconName } from './icons';

export function IconButton({
  icon,
  label,
  onPress,
  color,
  background,
  disabled = false,
}: {
  icon: IconName;
  /** Accessibility label: icon-only buttons must still say what they do. */
  label: string;
  onPress: () => void;
  color?: Color;
  background?: Color;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: theme.colors.line, borderless: true, radius: 24 }}
      style={[
        styles.button,
        background !== undefined && { backgroundColor: background },
        disabled && styles.disabled,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={22} color={color ?? theme.colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.38 },
});
