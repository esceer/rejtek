import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ApiError,
  canPull,
  canPush,
  formatDate,
  ServerUnreachableError,
  type ApiClient,
  type DiffKind,
  type SyncDifference,
} from '@rejtek/core';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { isCertificateMismatch } from '../server/pinned-fetch';
import { serverHost, type ServerConfig } from '../server/server-config';
import { useServer } from '../server/ServerProvider';
import {
  useLastSync,
  usePendingChanges,
  useSyncAction,
  useSyncDiff,
  type SyncAction,
} from '../sync/useSync';
import type { Theme } from '../theme/theme';
import { createStyles, useTheme } from '../theme/useTheme';
import { Group, GroupDivider } from '../ui/Group';
import type { IconName } from '../ui/icons';
import { PillButton } from '../ui/PillButton';
import { Screen } from '../ui/Screen';

const TAGS: Record<DiffKind, { label: string; tone: 'warn' | 'accent' | 'neutral' | 'danger' }> = {
  'changed-both': { label: 'Changed on both', tone: 'warn' },
  'local-only': { label: 'Only on phone', tone: 'accent' },
  'changed-local': { label: 'Changed on phone', tone: 'accent' },
  'server-only': { label: 'Only on server', tone: 'neutral' },
  'changed-server': { label: 'Changed on server', tone: 'neutral' },
  'deleted-local': { label: 'Deleted on phone', tone: 'danger' },
  'deleted-server': { label: 'Deleted on server', tone: 'danger' },
};

export default function SyncScreen() {
  const { config, api } = useServer();
  if (!config || !api) {
    return (
      <Screen onBack={router.back} title="Sync">
        <StatusView
          icon="lan-disconnect"
          tone="warn"
          title="Not connected"
          text="Connect this phone to your home server in Settings first."
        />
      </Screen>
    );
  }
  return <SyncContent config={config} api={api} />;
}

function SyncContent({ config, api }: { config: ServerConfig; api: ApiClient }) {
  const styles = useStyles();
  const theme = useTheme();
  const diff = useSyncDiff(api);
  const action = useSyncAction(api);
  const busy = action.isPending || diff.isFetching;
  const run = (next: SyncAction) => {
    action.mutate(next);
  };

  const online = diff.isSuccess;
  const subtitle = `${serverHost(config)} · ${diff.isPending ? 'checking…' : online ? 'online' : 'not reachable'}`;

  if (diff.isError) {
    return (
      <Screen
        onBack={router.back}
        title="Sync"
        subtitle={subtitle}
        footer={<PillButton label="Try again" onPress={() => void diff.refetch()} />}
      >
        <SyncProblem error={diff.error} />
      </Screen>
    );
  }

  if (!diff.data) {
    return (
      <Screen onBack={router.back} title="Sync" subtitle={subtitle}>
        <Text style={styles.muted}>Comparing with the server…</Text>
      </Screen>
    );
  }

  const { differences, compared } = diff.data;
  if (differences.length === 0) {
    return (
      <Screen
        onBack={router.back}
        title="Sync"
        subtitle={subtitle}
        footer={<PillButton label="Done" variant="secondary" onPress={router.back} />}
      >
        <StatusView
          icon="check"
          tone="ok"
          title="In sync"
          text={`All ${String(compared)} items match the server.`}
        />
      </Screen>
    );
  }

  return (
    <Screen
      onBack={router.back}
      title="Sync"
      subtitle={subtitle}
      footer={
        <>
          <PillButton
            label="Pull all"
            variant="secondary"
            disabled={busy || !differences.some(canPull)}
            onPress={() => {
              run({ type: 'pull-all', differences });
            }}
          />
          <PillButton
            label="Push all"
            disabled={busy || !differences.some(canPush)}
            onPress={() => {
              run({ type: 'push-all', differences });
            }}
          />
        </>
      }
    >
      <Group>
        <View style={styles.summary}>
          <Text style={styles.count}>
            {differences.length} {differences.length === 1 ? 'difference' : 'differences'}
          </Text>
          <Text style={styles.muted}>
            Compared {compared} items. Passwords are never shown here.
          </Text>
        </View>
      </Group>

      {action.isError && (
        <Text style={styles.error}>
          {action.error instanceof ApiError && action.error.status === 409
            ? 'An item changed on another device meanwhile. The list is refreshed, please check again.'
            : 'Could not complete the sync. Please try again.'}
        </Text>
      )}

      <Group>
        {differences.map((difference, index) => (
          <View key={difference.id}>
            {index > 0 && <GroupDivider />}
            <DifferenceRow
              difference={difference}
              theme={theme}
              disabled={busy}
              onPull={() => {
                run({ type: 'pull', difference });
              }}
              onPush={() => {
                run({ type: 'push', difference });
              }}
            />
          </View>
        ))}
      </Group>
    </Screen>
  );
}

function DifferenceRow({
  difference,
  theme,
  disabled,
  onPull,
  onPush,
}: {
  difference: SyncDifference;
  theme: Theme;
  disabled: boolean;
  onPull: () => void;
  onPush: () => void;
}) {
  const styles = useStyles();
  const tag = TAGS[difference.kind];
  const tagColors = {
    warn: [theme.colors.warnTint, theme.colors.warn],
    accent: [theme.colors.accentTint, theme.colors.accent],
    neutral: [theme.colors.field, theme.colors.muted],
    danger: [theme.colors.dangerTint, theme.colors.danger],
  } as const;
  const [background, color] = tagColors[tag.tone];

  return (
    <View style={styles.diffRow}>
      <View style={styles.diffText}>
        <Text style={styles.diffName} numberOfLines={1}>
          {difference.name}
        </Text>
        <View style={[styles.tag, { backgroundColor: background }]}>
          <Text style={[styles.tagText, { color }]}>{tag.label}</Text>
        </View>
      </View>
      <View style={styles.segment}>
        <SegmentButton
          icon="arrow-down"
          label="Pull"
          accessibilityLabel={`Pull ${difference.name} from server`}
          disabled={disabled || !canPull(difference)}
          onPress={onPull}
        />
        <SegmentButton
          icon="arrow-up"
          label="Push"
          accessibilityLabel={`Push ${difference.name} to server`}
          disabled={disabled || !canPush(difference)}
          onPress={onPush}
        />
      </View>
    </View>
  );
}

function SegmentButton({
  icon,
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  icon: IconName;
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.segmentButton, disabled && styles.disabled]}
    >
      <MaterialCommunityIcons name={icon} size={16} color={theme.colors.ink} />
      <Text style={styles.segmentText}>{label}</Text>
    </Pressable>
  );
}

/** Off the home network, revoked, or a different server certificate. */
function SyncProblem({ error }: { error: Error }) {
  const lastSync = useLastSync();
  const pending = usePendingChanges();

  if (error instanceof ApiError && error.status === 401) {
    return (
      <StatusView
        icon="cellphone-remove"
        tone="danger"
        title="Disconnected by the server"
        text="This phone was removed on the server’s Devices page. Connect again in Settings."
      />
    );
  }
  if (error instanceof ServerUnreachableError && isCertificateMismatch(error)) {
    return (
      <StatusView
        icon="shield-alert-outline"
        tone="danger"
        title="Server certificate changed"
        text="The server presented a different certificate than when you paired. Nothing was sent. If you reinstalled the server, disconnect and pair again."
      />
    );
  }
  return (
    <>
      <StatusView
        icon="wifi-off"
        tone="warn"
        title="Can’t reach your server"
        text="Sync only works on your home Wi-Fi. Your passwords on this phone still work as usual."
      />
      <Group>
        <InfoRow
          label="Last successful sync"
          value={lastSync.data ? formatDate(lastSync.data) : 'Never'}
        />
        <GroupDivider />
        <InfoRow label="Changes waiting on phone" value={String(pending.data ?? 0)} />
      </Group>
    </>
  );
}

function StatusView({
  icon,
  tone,
  title,
  text,
}: {
  icon: IconName;
  tone: 'ok' | 'warn' | 'danger';
  title: string;
  text: string;
}) {
  const styles = useStyles();
  const theme = useTheme();
  const colors = {
    ok: [theme.colors.okTint, theme.colors.ok],
    warn: [theme.colors.warnTint, theme.colors.warn],
    danger: [theme.colors.dangerTint, theme.colors.danger],
  } as const;
  const [background, color] = colors[tone];
  return (
    <View style={styles.status}>
      <View style={[styles.statusIcon, { backgroundColor: background }]}>
        <MaterialCommunityIcons name={icon} size={44} color={color} />
      </View>
      <Text style={styles.statusTitle}>{title}</Text>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const useStyles = createStyles((t) => ({
  muted: { fontSize: 14, color: t.colors.muted },
  error: { paddingHorizontal: 8, fontSize: 14, lineHeight: 20, color: t.colors.danger },
  summary: { padding: 20, gap: 4 },
  count: { fontSize: 28, fontWeight: '700', color: t.colors.ink },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 18,
    paddingRight: 12,
    paddingVertical: 14,
  },
  diffText: { flex: 1, gap: 6, alignItems: 'flex-start' },
  diffName: { fontSize: 16, fontWeight: '600', color: t.colors.ink },
  tag: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  tagText: { fontSize: 12, fontWeight: '600' },
  segment: { flexDirection: 'row', borderRadius: 22, padding: 2, backgroundColor: t.colors.field },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  segmentText: { fontSize: 13, fontWeight: '600', color: t.colors.ink },
  disabled: { opacity: 0.35 },
  status: { alignItems: 'center', paddingHorizontal: 24, paddingVertical: 32 },
  statusIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    marginTop: 24,
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    color: t.colors.ink,
  },
  statusText: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: t.colors.muted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  infoValue: { fontSize: 14, fontWeight: '600', color: t.colors.ink },
}));
