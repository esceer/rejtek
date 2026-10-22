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
import { useI18n } from '../i18n/I18nProvider';
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

const TAG_TONES: Record<DiffKind, 'warn' | 'accent' | 'neutral' | 'danger'> = {
  'changed-both': 'warn',
  'local-only': 'accent',
  'changed-local': 'accent',
  'server-only': 'neutral',
  'changed-server': 'neutral',
  'deleted-local': 'danger',
  'deleted-server': 'danger',
};

export default function SyncScreen() {
  const { config, api } = useServer();
  const { t } = useI18n();
  if (!config || !api) {
    return (
      <Screen onBack={router.back} title={t.sync.title}>
        <StatusView
          icon="lan-disconnect"
          tone="warn"
          title={t.sync.notConnectedTitle}
          text={t.sync.notConnectedText}
        />
      </Screen>
    );
  }
  return <SyncContent config={config} api={api} />;
}

function SyncContent({ config, api }: { config: ServerConfig; api: ApiClient }) {
  const styles = useStyles();
  const theme = useTheme();
  const { t } = useI18n();
  const diff = useSyncDiff(api);
  const action = useSyncAction(api);
  const busy = action.isPending || diff.isFetching;
  const run = (next: SyncAction) => {
    action.mutate(next);
  };

  const online = diff.isSuccess;
  const status = diff.isPending ? t.sync.checking : online ? t.sync.online : t.sync.offline;
  const subtitle = `${serverHost(config)} · ${status}`;

  if (diff.isError) {
    return (
      <Screen
        onBack={router.back}
        title={t.sync.title}
        subtitle={subtitle}
        footer={<PillButton label={t.common.tryAgain} onPress={() => void diff.refetch()} />}
      >
        <SyncProblem error={diff.error} />
      </Screen>
    );
  }

  if (!diff.data) {
    return (
      <Screen onBack={router.back} title={t.sync.title} subtitle={subtitle}>
        <Text style={styles.muted}>{t.sync.comparing}</Text>
      </Screen>
    );
  }

  const { differences, compared } = diff.data;
  if (differences.length === 0) {
    return (
      <Screen
        onBack={router.back}
        title={t.sync.title}
        subtitle={subtitle}
        footer={<PillButton label={t.common.done} variant="secondary" onPress={router.back} />}
      >
        <StatusView icon="check" tone="ok" title={t.sync.inSync} text={t.sync.allMatch(compared)} />
      </Screen>
    );
  }

  return (
    <Screen
      onBack={router.back}
      title={t.sync.title}
      subtitle={subtitle}
      footer={
        <>
          <PillButton
            label={t.sync.pullAll}
            variant="secondary"
            disabled={busy || !differences.some(canPull)}
            onPress={() => {
              run({ type: 'pull-all', differences });
            }}
          />
          <PillButton
            label={t.sync.pushAll}
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
          <Text style={styles.count}>{t.sync.differences(differences.length)}</Text>
          <Text style={styles.muted}>{t.sync.compared(compared)}</Text>
        </View>
      </Group>

      {action.isError && (
        <Text style={styles.error}>
          {action.error instanceof ApiError && action.error.status === 409
            ? t.sync.conflict
            : t.sync.failed}
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
  const { t } = useI18n();
  const tone = TAG_TONES[difference.kind];
  const tagColors = {
    warn: [theme.colors.warnTint, theme.colors.warn],
    accent: [theme.colors.accentTint, theme.colors.accent],
    neutral: [theme.colors.field, theme.colors.muted],
    danger: [theme.colors.dangerTint, theme.colors.danger],
  } as const;
  const [background, color] = tagColors[tone];

  return (
    <View style={styles.diffRow}>
      <View style={styles.diffText}>
        <Text style={styles.diffName} numberOfLines={1}>
          {difference.name}
        </Text>
        <View style={[styles.tag, { backgroundColor: background }]}>
          <Text style={[styles.tagText, { color }]}>{t.sync.tags[difference.kind]}</Text>
        </View>
      </View>
      <View style={styles.segment}>
        <SegmentButton
          icon="arrow-down"
          label={t.sync.pull}
          accessibilityLabel={t.sync.pullItem(difference.name)}
          disabled={disabled || !canPull(difference)}
          onPress={onPull}
        />
        <SegmentButton
          icon="arrow-up"
          label={t.sync.push}
          accessibilityLabel={t.sync.pushItem(difference.name)}
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
  const { t, language } = useI18n();
  const lastSync = useLastSync();
  const pending = usePendingChanges();

  if (error instanceof ApiError && error.status === 401) {
    return (
      <StatusView
        icon="cellphone-remove"
        tone="danger"
        title={t.sync.revokedTitle}
        text={t.sync.revokedText}
      />
    );
  }
  if (error instanceof ServerUnreachableError && isCertificateMismatch(error)) {
    return (
      <StatusView
        icon="shield-alert-outline"
        tone="danger"
        title={t.sync.certificateChangedTitle}
        text={t.sync.certificateChangedText}
      />
    );
  }
  return (
    <>
      <StatusView
        icon="wifi-off"
        tone="warn"
        title={t.sync.offlineTitle}
        text={t.sync.offlineText}
      />
      <Group>
        <InfoRow
          label={t.sync.lastSync}
          value={lastSync.data ? formatDate(lastSync.data, language) : t.sync.never}
        />
        <GroupDivider />
        <InfoRow label={t.sync.pending} value={String(pending.data ?? 0)} />
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
