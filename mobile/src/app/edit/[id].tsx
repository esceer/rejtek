import { generatePassword, type VaultItemData } from '@rejtek/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
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
  const [data, setData] = useState(initial);
  const [nameError, setNameError] = useState<string>();
  const save = useSaveLocalItem();

  const set = (field: keyof VaultItemData) => (value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };

  const submit = () => {
    if (!data.name.trim()) {
      setNameError('Give the item a name');
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
      title={id ? 'Edit item' : 'New item'}
      footer={
        <PillButton
          label={save.isPending ? 'Saving…' : 'Save'}
          disabled={save.isPending}
          onPress={submit}
        />
      }
    >
      <Group>
        <FormField
          label="Name"
          error={nameError}
          value={data.name}
          onChangeText={set('name')}
          autoFocus={!id}
        />
        <GroupDivider />
        <FormField
          label="Website"
          value={data.url}
          onChangeText={set('url')}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <GroupDivider />
        <FormField
          label="Username"
          value={data.username}
          onChangeText={set('username')}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </Group>

      <Group>
        <FormField
          label="Password"
          value={data.password}
          onChangeText={set('password')}
          autoCapitalize="none"
          autoCorrect={false}
          mono
          trailing={
            <IconButton
              icon="dice-multiple-outline"
              label="Generate a strong password"
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
          label="Notes"
          value={data.notes}
          onChangeText={set('notes')}
          multiline
          textAlignVertical="top"
        />
      </Group>

      {save.isError && <Text style={styles.error}>Could not save. Please try again.</Text>}
    </Screen>
  );
}

const useStyles = createStyles((t) => ({
  error: { paddingHorizontal: 8, fontSize: 14, color: t.colors.danger },
}));
