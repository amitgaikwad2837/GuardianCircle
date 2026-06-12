/**
 * Design tokens for GuardianCircle.
 * All colours, spacing, typography, and radius values come from here.
 * Never use hardcoded values in components.
 */

export const colors = {
  // Emergency / SOS
  sosRed: '#D32F2F',
  sosRedDark: '#B71C1C',
  sosRedLight: '#FFCDD2',

  // Status
  safe: '#2E7D32',
  warning: '#F57F17',
  danger: '#C62828',
  info: '#1565C0',
  neutral: '#546E7A',

  // Success
  success: '#2E7D32',

  // UI — Light mode
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    onBackground: '#212121',
    onSurface: '#212121',
    onSurfaceVariant: '#757575',
    border: '#E0E0E0',
    divider: '#EEEEEE',
    primary: '#1565C0',
    onPrimary: '#FFFFFF',
  },

  // UI — Dark mode
  dark: {
    background: '#121212',
    surface: '#1E1E1E',
    surfaceVariant: '#2C2C2C',
    onBackground: '#EEEEEE',
    onSurface: '#EEEEEE',
    onSurfaceVariant: '#BDBDBD',
    border: '#424242',
    divider: '#303030',
    primary: '#90CAF9',
    onPrimary: '#0D47A1',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  // sp units — respect user font scale
  displayLarge: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  displayMedium: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  headlineLarge: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  headlineMedium: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  titleLarge: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  titleMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 22 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  labelMedium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  titleSmall: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;

export const touchTargets = {
  minimum: 48,   // WCAG minimum
  comfortable: 56,
  emergency: 120, // SOS button
} as const;
