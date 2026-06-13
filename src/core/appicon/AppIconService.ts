import { NativeModules, Platform } from 'react-native';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';
import { Logger } from '@core/logger/Logger';

const TAG = 'AppIconService';

/**
 * App icon variants.
 *
 * Each variant corresponds to an <activity-alias> in AndroidManifest.xml with a
 * distinct android:icon / android:label. Swapping the enabled alias changes what
 * the launcher shows. The real MainActivity is always enabled — only the aliases
 * are toggled.
 *
 * Variants must match alias names declared in AndroidManifest.xml:
 *   com.guardiancircle.MainActivity          → default (GuardianCircle)
 *   com.guardiancircle.alias.Calculator      → "Calculator" disguise
 *   com.guardiancircle.alias.WeatherApp      → "Weather" disguise
 *   com.guardiancircle.alias.Notes           → "Notes" disguise
 */
export type AppIconVariant = 'default' | 'calculator' | 'weather' | 'notes';

export const APP_ICON_VARIANTS: { id: AppIconVariant; label: string; description: string }[] = [
  { id: 'default',    label: 'GuardianCircle', description: 'Original app icon and name' },
  { id: 'calculator', label: 'Calculator',     description: 'Disguised as a calculator app' },
  { id: 'weather',    label: 'Weather',        description: 'Disguised as a weather app' },
  { id: 'notes',      label: 'Notes',          description: 'Disguised as a notes app' },
];

const PACKAGE = 'com.guardiancircle';

const ALIAS_MAP: Record<AppIconVariant, string> = {
  default:    `${PACKAGE}.MainActivity`,
  calculator: `${PACKAGE}.alias.Calculator`,
  weather:    `${PACKAGE}.alias.WeatherApp`,
  notes:      `${PACKAGE}.alias.Notes`,
};

// Native module — provided by a thin Kotlin shim (AppIconModule.kt)
interface AppIconNativeModule {
  setActiveAlias(alias: string): Promise<void>;
}

function getNativeModule(): AppIconNativeModule | null {
  if (Platform.OS !== 'android') {return null;}
  const mod = NativeModules.AppIconModule as AppIconNativeModule | undefined;
  if (!mod) {
    Logger.warn(TAG, 'AppIconModule not available — icon switching disabled');
    return null;
  }
  return mod;
}

export const AppIconService = {
  getCurrentVariant(): AppIconVariant {
    return (PreferencesStore.getString(PREF_KEYS.APP_ICON_VARIANT) as AppIconVariant | undefined)
      ?? 'default';
  },

  async setVariant(variant: AppIconVariant): Promise<void> {
    const mod = getNativeModule();
    if (!mod) {return;}

    const alias = ALIAS_MAP[variant];
    try {
      await mod.setActiveAlias(alias);
      PreferencesStore.setString(PREF_KEYS.APP_ICON_VARIANT, variant);
      Logger.info(TAG, `Icon variant set to ${variant} (${alias})`);
    } catch (err) {
      Logger.error(TAG, `Failed to set icon variant ${variant}`, { message: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  },
};
