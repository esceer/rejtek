import type { ReactNode } from 'react';
import { View } from 'react-native';
import { createStyles } from '../theme/useTheme';

/** Rounded card grouping related rows (OxygenOS settings style). */
export function Group({ children }: { children: ReactNode }) {
  const styles = useStyles();
  return <View style={styles.group}>{children}</View>;
}

/** Inset hairline between rows of a group. */
export function GroupDivider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = createStyles((t) => ({
  group: { backgroundColor: t.colors.card, borderRadius: 22, overflow: 'hidden' },
  divider: { height: 1, marginLeft: 18, backgroundColor: t.colors.line },
}));
