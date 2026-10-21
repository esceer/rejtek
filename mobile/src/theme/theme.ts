import { Platform, PlatformColor, type NativeColorValue } from 'react-native';

/** A hex colour, or an Android system colour (Material You). */
export type Color = string | NativeColorValue;

export interface Theme {
  readonly dark: boolean;
  readonly colors: {
    readonly bg: Color;
    readonly card: Color;
    readonly field: Color;
    readonly line: Color;
    readonly ink: Color;
    readonly muted: Color;
    readonly accent: Color;
    readonly onAccent: Color;
    readonly accentTint: Color;
    readonly ok: Color;
    readonly okTint: Color;
    readonly warn: Color;
    readonly warnTint: Color;
    readonly danger: Color;
    readonly dangerTint: Color;
  };
}

// Design tokens: see CLAUDE.md › UI.
const light: Theme = {
  dark: false,
  colors: {
    bg: '#F2F3F5',
    card: '#FFFFFF',
    field: '#E4E6EA',
    line: '#ECEEF1',
    ink: '#111827',
    muted: '#5B6472',
    accent: '#2453D4',
    onAccent: '#FFFFFF',
    accentTint: '#E3EAFB',
    ok: '#1F7A4D',
    okTint: '#DDF0E5',
    warn: '#8A4B00',
    warnTint: '#FDF1DC',
    danger: '#B42318',
    dangerTint: '#FBE7E7',
  },
};

const dark: Theme = {
  dark: true,
  colors: {
    bg: '#101114',
    card: '#1C1D21',
    field: '#26282D',
    line: '#2A2C31',
    ink: '#ECEDEF',
    muted: '#9AA0A8',
    accent: '#8AA8FF',
    onAccent: '#0B1A3D',
    accentTint: '#1B2747',
    ok: '#4CC38A',
    okTint: '#16301F',
    warn: '#F5C16C',
    warnTint: '#3A2A10',
    danger: '#FF9B9B',
    dangerTint: '#3D1A1A',
  },
};

/** Android 12+ exposes the wallpaper-based Material You palette as system colours. */
const hasDynamicColor = Platform.OS === 'android' && Platform.Version >= 31;

function withDynamicAccent(theme: Theme): Theme {
  if (!hasDynamicColor) {
    return theme;
  }
  const tone = (shade: number) => PlatformColor(`@android:color/system_accent1_${String(shade)}`);
  return {
    ...theme,
    colors: {
      ...theme.colors,
      accent: tone(theme.dark ? 200 : 600),
      onAccent: theme.dark ? tone(900) : '#FFFFFF',
      accentTint: tone(theme.dark ? 800 : 100),
    },
  };
}

export const themes = { light: withDynamicAccent(light), dark: withDynamicAccent(dark) } as const;
