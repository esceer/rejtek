import { MaterialCommunityIcons } from '@expo/vector-icons';
import { searchItems, type DecryptedVaultItem } from '@rejtek/core';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useServer } from '../server/ServerProvider';
import { createStyles, useTheme } from '../theme/useTheme';
import { Avatar } from '../ui/Avatar';
import { IconButton } from '../ui/IconButton';
import { Screen } from '../ui/Screen';
import { SearchField } from '../ui/SearchField';
import { useLocalItems } from '../vault/useLocalVault';
import { useUnlockedVault } from '../vault/VaultProvider';

export default function VaultScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lock } = useUnlockedVault();
  const { config } = useServer();
  const items = useLocalItems();
  const [query, setQuery] = useState('');

  const all = useMemo(() => items.data ?? [], [items.data]);
  const results = useMemo(() => searchItems(all, query), [all, query]);

  return (
    <Screen
      title="Vault"
      subtitle={
        items.isSuccess
          ? `${String(all.length)} ${all.length === 1 ? 'item' : 'items'}`
          : 'Decrypting…'
      }
      headerRight={
        <>
          <IconButton
            icon="sync"
            label="Sync"
            color={config ? theme.colors.accent : theme.colors.ink}
            disabled={!config}
            onPress={() => {
              router.push('/sync');
            }}
          />
          <IconButton icon="lock-outline" label="Lock now" onPress={lock} />
          <IconButton
            icon="cog-outline"
            label="Settings"
            onPress={() => {
              router.push('/settings');
            }}
          />
        </>
      }
      scroll={false}
    >
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 104 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <SearchField value={query} onChangeText={setQuery} />
          </View>
        }
        ListEmptyComponent={
          items.isSuccess ? (
            <Text style={styles.empty}>
              {all.length === 0
                ? 'No passwords yet. Tap + to add your first one.'
                : 'Nothing matches your search.'}
            </Text>
          ) : undefined
        }
        renderItem={({ item, index }) => (
          <ItemRow item={item} first={index === 0} last={index === results.length - 1} />
        )}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add item"
        onPress={() => {
          router.push('/edit/new');
        }}
        style={[styles.fab, { bottom: insets.bottom + 24 }]}
      >
        <MaterialCommunityIcons name="plus" size={28} color={theme.colors.onAccent} />
      </Pressable>
    </Screen>
  );
}

function ItemRow({
  item,
  first,
  last,
}: {
  item: DecryptedVaultItem;
  first: boolean;
  last: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push(`/item/${item.id}`);
      }}
      style={[styles.row, first && styles.rowFirst, last && styles.rowLast]}
    >
      <Avatar name={item.data.name} />
      <View style={[styles.rowText, !first && styles.rowDivider]}>
        <Text style={styles.rowName} numberOfLines={1}>
          {item.data.name}
        </Text>
        {item.data.username !== '' && (
          <Text style={styles.rowUser} numberOfLines={1}>
            {item.data.username}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = createStyles((t) => ({
  list: { paddingHorizontal: 16 },
  header: { gap: 12, paddingBottom: 12 },
  empty: { padding: 24, textAlign: 'center', fontSize: 15, color: t.colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingLeft: 18,
    minHeight: 66,
    backgroundColor: t.colors.card,
  },
  rowFirst: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  rowLast: { borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  rowText: { flex: 1, alignSelf: 'stretch', justifyContent: 'center', gap: 2, paddingRight: 18 },
  rowDivider: { borderTopWidth: 1, borderTopColor: t.colors.line },
  rowName: { fontSize: 16, fontWeight: '600', color: t.colors.ink },
  rowUser: { fontSize: 14, color: t.colors.muted },
  fab: {
    position: 'absolute',
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.accent,
    elevation: 6,
  },
}));
