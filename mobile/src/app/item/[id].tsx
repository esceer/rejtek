import { displayHost, formatDate, safeHref } from '@rejtek/core';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { copySecret } from '../../lib/clipboard';
import { useAutoHide } from '../../lib/useAutoHide';
import { createStyles, useTheme } from '../../theme/useTheme';
import { Avatar } from '../../ui/Avatar';
import { Group, GroupDivider } from '../../ui/Group';
import { IconButton } from '../../ui/IconButton';
import { PillButton } from '../../ui/PillButton';
import { Screen } from '../../ui/Screen';
import { useDeleteLocalItem, useLocalItem } from '../../vault/useLocalVault';

const REVEAL_SECONDS = 30;

export default function ItemScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item } = useLocalItem(id);
  const reveal = useAutoHide(REVEAL_SECONDS);
  const remove = useDeleteLocalItem();

  if (!item) {
    return (
      <Screen onBack={router.back} title="Not found">
        <Text style={styles.muted}>This item no longer exists.</Text>
      </Screen>
    );
  }

  const { data } = item;
  const href = safeHref(data.url);

  const confirmDelete = () => {
    Alert.alert(`Delete ${data.name}?`, 'This removes it from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove.mutate(item.id, {
            onSuccess: () => {
              router.back();
            },
          });
        },
      },
    ]);
  };

  return (
    <Screen
      onBack={router.back}
      headerRight={
        <IconButton icon="trash-can-outline" label="Delete item" onPress={confirmDelete} />
      }
      footer={
        <PillButton
          label="Edit"
          icon="pencil-outline"
          variant="secondary"
          onPress={() => {
            router.push(`/edit/${item.id}`);
          }}
        />
      }
    >
      <View style={styles.header}>
        <Avatar name={data.name} size={56} />
        <View style={styles.headerText}>
          <Text style={styles.name} accessibilityRole="header" numberOfLines={2}>
            {data.name}
          </Text>
          {data.url !== '' && <Text style={styles.host}>{displayHost(data.url)}</Text>}
        </View>
      </View>

      <Group>
        {data.username !== '' && (
          <>
            <Row label="Username" value={data.username}>
              <IconButton
                icon="content-copy"
                label="Copy username"
                onPress={() => void copySecret(data.username)}
              />
            </Row>
            <GroupDivider />
          </>
        )}
        <Row
          label="Password"
          value={reveal.remaining === null ? '••••••••••••' : data.password}
          mono={reveal.remaining !== null}
        >
          <IconButton
            icon={reveal.remaining === null ? 'eye-outline' : 'eye-off-outline'}
            label={reveal.remaining === null ? 'Reveal password' : 'Hide password'}
            color={theme.colors.accent}
            onPress={reveal.remaining === null ? reveal.show : reveal.hide}
          />
          <IconButton
            icon="content-copy"
            label="Copy password"
            onPress={() => void copySecret(data.password)}
          />
        </Row>
        {reveal.remaining !== null && (
          <View style={styles.countdown}>
            <View style={styles.track}>
              <View
                style={[
                  styles.progress,
                  { width: `${String((reveal.remaining / REVEAL_SECONDS) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.small}>Hides in {reveal.remaining} s</Text>
          </View>
        )}
        {href !== null && (
          <>
            <GroupDivider />
            <Row label="Website" value={href}>
              <IconButton
                icon="open-in-new"
                label="Open website"
                onPress={() => void Linking.openURL(href)}
              />
            </Row>
          </>
        )}
      </Group>

      {data.notes !== '' && (
        <Group>
          <View style={styles.notes}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        </Group>
      )}

      <Text style={[styles.small, styles.updated]}>Last changed {formatDate(item.updatedAt)}</Text>
    </Screen>
  );
}

function Row({
  label,
  value,
  mono = false,
  children,
}: {
  label: string;
  value: string;
  mono?: boolean;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, mono && styles.mono]} selectable={false}>
          {value}
        </Text>
      </View>
      {children}
    </View>
  );
}

const useStyles = createStyles((t) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerText: { flex: 1 },
  name: { fontSize: 30, fontWeight: '700', color: t.colors.ink },
  host: { fontSize: 15, color: t.colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 10,
  },
  rowText: { flex: 1 },
  label: { fontSize: 13, color: t.colors.muted },
  value: { marginTop: 2, fontSize: 16, fontWeight: '500', color: t.colors.ink },
  mono: { fontFamily: 'monospace', fontSize: 17 },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: t.colors.field,
  },
  progress: { height: 4, backgroundColor: t.colors.accent },
  small: { fontSize: 12, color: t.colors.muted },
  notes: { paddingHorizontal: 18, paddingVertical: 14 },
  notesText: { marginTop: 4, fontSize: 15, lineHeight: 22, color: t.colors.ink },
  updated: { paddingHorizontal: 8 },
  muted: { fontSize: 15, color: t.colors.muted, paddingHorizontal: 8 },
}));
