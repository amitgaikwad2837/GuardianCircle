import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors, spacing, radius, typography, touchTargets } from './tokens';

export type ColorScheme = 'light' | 'dark';

export interface Theme {
  scheme: ColorScheme;
  colors: {
    background: string;
    surface: string;
    surfaceVariant: string;
    onBackground: string;
    onSurface: string;
    onSurfaceVariant: string;
    border: string;
    divider: string;
    primary: string;
    onPrimary: string;
    // Semantic — same in both schemes
    sosRed: string;
    sosRedDark: string;
    sosRedLight: string;
    safe: string;
    warning: string;
    danger: string;
    info: string;
    neutral: string;
  };
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  touchTargets: typeof touchTargets;
}

function buildTheme(scheme: ColorScheme): Theme {
  const adaptive = scheme === 'dark' ? colors.dark : colors.light;
  return {
    scheme,
    colors: {
      ...adaptive,
      sosRed:      colors.sosRed,
      sosRedDark:  colors.sosRedDark,
      sosRedLight: colors.sosRedLight,
      safe:        colors.safe,
      warning:     colors.warning,
      danger:      colors.danger,
      info:        colors.info,
      neutral:     colors.neutral,
    },
    spacing,
    radius,
    typography,
    touchTargets,
  };
}

const ThemeContext = createContext<Theme>(buildTheme('light'));

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Override the system color scheme — used in Settings for manual dark mode toggle. */
  overrideScheme?: ColorScheme | null;
}

export function ThemeProvider({ children, overrideScheme }: ThemeProviderProps): React.JSX.Element {
  const systemScheme = useColorScheme();
  const scheme: ColorScheme = overrideScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Returns the current theme. Must be used inside ThemeProvider. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
