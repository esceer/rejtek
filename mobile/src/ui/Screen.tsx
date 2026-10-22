import type { ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../i18n/I18nProvider';
import { createStyles } from '../theme/useTheme';
import { IconButton } from './IconButton';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onClose?: () => void;
  headerRight?: ReactNode;
  /** Pinned to the bottom, within thumb reach. */
  footer?: ReactNode;
  /** Set false when the content brings its own scrolling (e.g. a FlatList). */
  scroll?: boolean;
  children: ReactNode;
}

/** OxygenOS-style screen: small top bar, large title, content, optional bottom actions. */
export function Screen({
  title,
  subtitle,
  onBack,
  onClose,
  headerRight,
  footer,
  scroll = true,
  children,
}: ScreenProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const Body = scroll ? ScrollView : View;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 4 }]}>
      <View style={styles.topBar}>
        {onBack && <IconButton icon="arrow-left" label={t.common.back} onPress={onBack} />}
        {onClose && <IconButton icon="close" label={t.common.close} onPress={onClose} />}
        <View style={styles.spacer} />
        {headerRight}
      </View>
      {title !== undefined && (
        <View style={styles.titleBlock}>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      <Body
        style={styles.body}
        {...(scroll
          ? {
              contentContainerStyle: styles.scrollContent,
              keyboardShouldPersistTaps: 'handled' as const,
            }
          : {})}
      >
        {children}
      </Body>
      {footer !== undefined && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>{footer}</View>
      )}
    </View>
  );
}

const useStyles = createStyles((t) => ({
  root: { flex: 1, backgroundColor: t.colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 48 },
  spacer: { flex: 1 },
  titleBlock: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 34, fontWeight: '700', letterSpacing: -0.5, color: t.colors.ink },
  subtitle: { marginTop: 2, fontSize: 14, color: t.colors.muted },
  body: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
}));
