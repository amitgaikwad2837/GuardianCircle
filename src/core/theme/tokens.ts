/**
 * Design tokens for GuardianCircle.
 * Palette: teal primary (calm/protective), indigo secondary (trustworthy),
 * warm amber for warnings. Red is reserved ONLY for the SOS emergency button.
 */
import { PixelRatio } from 'react-native';

const fontScale = PixelRatio.getFontScale();

function scaled(size: number): number {
  // Clamp to 1.3× to prevent layout breaks at very large system font sizes.
  return Math.round(size * Math.min(fontScale, 1.3));
}

export const colors = {
  // ── Emergency — ONLY for the SOS button itself ──────────────────────────
  sosRed: '#C62828',
  sosRedDark: '#B71C1C',
  sosRedLight: '#FFCDD2',

  // ── Brand (logo colours) ────────────────────────────────────────────────
  brandIndigo: '#1A237E',
  brandIndigoMid: '#3F51B5',
  brandGreen: '#1B5E20',
  brandGreenMid: '#2E7D32',

  // ── Primary action — teal (calm, protective, safe) ──────────────────────
  primary: '#00897B',
  primaryDark: '#00695C',
  primaryLight: '#4DB6AC',
  primarySurface: '#E0F2F1',

  // ── Semantic states ─────────────────────────────────────────────────────
  safe: '#2E7D32',
  warning: '#E65100',
  danger: '#C62828',
  info: '#0277BD',
  neutral: '#546E7A',
  success: '#2E7D32',

  // ── Light mode ──────────────────────────────────────────────────────────
  light: {
    background: '#F4FAF9',
    surface: '#FFFFFF',
    surfaceVariant: '#E8F5F3',
    onBackground: '#1B2B2A',
    onSurface: '#1B2B2A',
    onSurfaceVariant: '#4A6360',
    border: '#B2DFDB',
    divider: '#E0F2F1',
    primary: '#00897B',
    primaryDark: '#00695C',
    onPrimary: '#FFFFFF',
    secondary: '#3F51B5',
    onSecondary: '#FFFFFF',
  },

  // ── Dark mode ────────────────────────────────────────────────────────────
  dark: {
    background: '#0D1F1D',
    surface: '#162E2B',
    surfaceVariant: '#1F3D39',
    onBackground: '#E0F2F1',
    onSurface: '#E0F2F1',
    onSurfaceVariant: '#80CBC4',
    border: '#37474F',
    divider: '#1F3533',
    primary: '#4DB6AC',
    primaryDark: '#00897B',
    onPrimary: '#00332E',
    secondary: '#9FA8DA',
    onSecondary: '#1A237E',
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
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
} as const;

export const typography = {
  displayLarge:   { fontSize: scaled(32), fontWeight: '700' as const, lineHeight: scaled(40) },
  displayMedium:  { fontSize: scaled(28), fontWeight: '700' as const, lineHeight: scaled(36) },
  headlineLarge:  { fontSize: scaled(24), fontWeight: '700' as const, lineHeight: scaled(32) },
  headlineMedium: { fontSize: scaled(20), fontWeight: '600' as const, lineHeight: scaled(28) },
  titleLarge:     { fontSize: scaled(18), fontWeight: '600' as const, lineHeight: scaled(24) },
  titleMedium:    { fontSize: scaled(16), fontWeight: '600' as const, lineHeight: scaled(22) },
  titleSmall:     { fontSize: scaled(14), fontWeight: '600' as const, lineHeight: scaled(20) },
  bodyLarge:      { fontSize: scaled(16), fontWeight: '400' as const, lineHeight: scaled(24) },
  bodyMedium:     { fontSize: scaled(14), fontWeight: '400' as const, lineHeight: scaled(20) },
  bodySmall:      { fontSize: scaled(12), fontWeight: '400' as const, lineHeight: scaled(16) },
  labelLarge:     { fontSize: scaled(15), fontWeight: '600' as const, lineHeight: scaled(20) },
  labelMedium:    { fontSize: scaled(13), fontWeight: '500' as const, lineHeight: scaled(18) },
  labelSmall:     { fontSize: scaled(11), fontWeight: '500' as const, lineHeight: scaled(16) },
};

export const touchTargets = {
  minimum: 48,
  comfortable: 56,
  emergency: 120,
} as const;
