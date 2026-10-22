import { displayHost, formatDate, safeHref } from '@rejtek/core';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { Alert, Linking, Text, View } from 'react-native';
import { copySecret } from '../../lib/clipboard';
import { useI18n } from '../../i18n/I18nProvider';
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
  const { t, language } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: item } = useLocalItem(id);
  const reveal = useAutoHide(REVEAL_SECONDS);
  const remove = useDeleteLocalItem();

  if (!item) {
    return (
      <Screen onBack={router.back} title={t.item.notFound}>
        <Text style={styles.muted}>{t.item.notFoundText}</Text>
      </Screen>
    );
  }

  const { data } = item;
  const href = safeHref(data.url);

  const confirmDelete = () => {
    Alert.alert(t.item.deleteTitle(data.name), t.item.deleteText, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
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
        <IconButton icon="trash-can-outline" label={t.item.deleteItem} onPress={confirmDelete} />
      }
      footer={
        <PillButton
          label={t.item.edit}
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
            <Row label={t.fields.username} value={data.username}>
              <IconButton
                icon="content-copy"
                label={t.item.copyUsername}
                onPress={() => void copySecret(data.username)}
              />
            </Row>
            <GroupDivider />
          </>
        )}
        <Row
          label={t.fields.password}
          value={reveal.remaining === null ? '••••••••••••' : data.password}
          mono={reveal.remaining !== null}
        >
          <IconButton
            icon={reveal.remaining === null ? 'eye-outline' : 'eye-off-outline'}
            label={reveal.remaining === null ? t.item.revealPassword : t.item.hidePassword}
            color={theme.colors.accent}
            onPress={reveal.remaining === null ? reveal.show : reveal.hide}
          />
          <IconButton
            icon="content-copy"
            label={t.item.copyPassword}
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
            <Text style={styles.small}>{t.item.hidesIn(reveal.remaining)}</Text>
          </View>
        )}
        {href !== null && (
          <>
            <GroupDivider />
            <Row label={t.fields.website} value={href}>
              <IconButton
                icon="open-in-new"
                label={t.item.openWebsite}
                onPress={() => void Linking.openURL(href)}
              />
            </Row>
          </>
        )}
      </Group>

      {data.notes !== '' && (
        <Group>
          <View style={styles.notes}>
            <Text style={styles.label}>{t.fields.notes}</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        </Group>
      )}

      <Text style={[styles.small, styles.updated]}>
        {t.item.lastChanged(formatDate(item.updatedAt, language))}
      </Text>
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
