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
}: {
  icon: IconName;
  /** Accessibility label: icon-only buttons must still say what they do. */
  label: string;
  onPress: () => void;
  color?: Color;
  background?: Color;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      android_ripple={{ color: theme.colors.line, borderless: true, radius: 24 }}
      style={[styles.button, background !== undefined && { backgroundColor: background }]}
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
});
