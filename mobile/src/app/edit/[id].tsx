import { generatePassword, type VaultItemData } from '@rejtek/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useI18n } from '../../i18n/I18nProvider';
import { loadSodium } from '../../lib/sodium';
import { createStyles, useTheme } from '../../theme/useTheme';
import { FormField } from '../../ui/FormField';
import { Group, GroupDivider } from '../../ui/Group';
import { IconButton } from '../../ui/IconButton';
import { PillButton } from '../../ui/PillButton';
import { Screen } from '../../ui/Screen';
import { StrengthMeter } from '../../ui/StrengthMeter';
import { useLocalItem, useSaveLocalItem } from '../../vault/useLocalVault';

const EMPTY: VaultItemData = { name: '', url: '', username: '', password: '', notes: '' };

/** `/edit/new` creates an item, `/edit/<id>` edits one. */
export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const existing = useLocalItem(id);

  if (!isNew && !existing.data) {
    return null; // still decrypting, or deleted in the meantime
  }
  return <EditForm id={isNew ? undefined : id} initial={existing.data?.data ?? EMPTY} />;
}

function EditForm({ id, initial }: { id: string | undefined; initial: VaultItemData }) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useI18n();
  const [data, setData] = useState(initial);
  const [nameError, setNameError] = useState<string>();
  const save = useSaveLocalItem();

  const set = (field: keyof VaultItemData) => (value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    if (!data.name.trim()) {
      setNameError(t.edit.nameRequired);
      return;
    }
    save.mutate(
      { id, data: { ...data, name: data.name.trim() } },
      {
        onSuccess: (savedId) => {
          if (id) {
            router.back();
          } else {
            router.replace(`/item/${savedId}`);
          }
        },
      },
    );
  };

  return (
    <Screen
      onClose={router.back}
      title={id ? t.edit.editItem : t.edit.newItem}
      footer={
        <PillButton
          label={save.isPending ? t.common.saving : t.common.save}
          disabled={save.isPending}
          onPress={submit}
        />
      }
    >
      <Group>
        <FormField
          label={t.fields.name}
          error={nameError}
          value={data.name}
          onChangeText={set('name')}
          autoFocus={!id}
        />
        <GroupDivider />
        <FormField
          label={t.fields.website}
          value={data.url}
          onChangeText={set('url')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <GroupDivider />
        <FormField
          label={t.fields.username}
          value={data.username}
          onChangeText={set('username')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Group>

      <Group>
        <FormField
          label={t.fields.password}
          value={data.password}
          onChangeText={set('password')}
          autoCapitalize="none"
          autoCorrect={false}
          mono
          trailing={
            <IconButton
              icon="dice-multiple-outline"
              label={t.edit.generate}
              color={theme.colors.accent}
              background={theme.colors.accentTint}
              onPress={() =>
                void loadSodium().then((sodium) => {
                  set('password')(generatePassword(sodium));
                })
              }
            />
          }
        />
        <StrengthMeter password={data.password} />
      </Group>

      <Group>
        <FormField
          label={t.fields.notes}
          value={data.notes}
          onChangeText={set('notes')}
          multiline
          textAlignVertical="top"
        />
      </Group>

      {save.isError && <Text style={styles.error}>{t.edit.saveError}</Text>}
    </Screen>
  );
}

const useStyles = createStyles((t) => ({
  error: { paddingHorizontal: 8, fontSize: 14, color: t.colors.danger },
}));
