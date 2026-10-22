import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TextInput, View } from 'react-native';
import { useI18n } from '../i18n/I18nProvider';
import { createStyles, useTheme } from '../theme/useTheme';

export function SearchField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={styles.field}>
      <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.muted} />
      <TextInput
        accessibilityLabel={t.vault.searchLabel}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? t.vault.search}
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
