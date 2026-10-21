import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { createStyles, useTheme } from '../theme/useTheme';

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.muted} />
      <TextInput
        accessibilityLabel="Search vault"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
    </View>
  );
}

const useStyles = createStyles((t) => ({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 25,
    paddingHorizontal: 18,
    backgroundColor: t.colors.field,
  },
  input: { flex: 1, fontSize: 16, color: t.colors.ink, paddingVertical: 0 },
}));
