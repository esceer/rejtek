import { StyleSheet, useColorScheme } from 'react-native';
import { themes, type Theme } from './theme';

/** Follows the system light/dark setting. */
export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? themes.dark : themes.light;
}

/** Whatever `StyleSheet.create` accepts (named view/text/image styles). */
type StyleRecord = Parameters<typeof StyleSheet.create>[0];

/**
 * Defines a component's styles once per theme:
 * `const useStyles = createStyles((t) => ({ … }))`, then `const styles = useStyles()`.
 */
export function createStyles<S extends StyleRecord>(
  // The intersection gives style literals (e.g. 'row') their contextual types.
  factory: (theme: Theme) => S & StyleRecord,
) {
  const cache = new Map<Theme, Readonly<S>>();
  return function useStyles(): Readonly<S> {
    const theme = useTheme();
    const cached = cache.get(theme);
    if (cached) {
      return cached;
    }
    const styles = StyleSheet.create(factory(theme));
    cache.set(theme, styles);
    return styles;
  };
}
