import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { AIProviderFactory } from '../../application/AIProviderFactory';
import type { AIProviderType, IAIProvider } from '../../domain/interfaces/IAIProvider';
import type { SettingsStackParams } from '@core/navigation/NavigationTypes';
import { PreferencesStore, PREF_KEYS } from '@core/storage/preferences/PreferencesStore';

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful assistant. Answer the user\'s questions clearly and concisely. ' +
  'Respect privacy and do not encourage harmful activities.';

type Nav = NativeStackNavigationProp<SettingsStackParams>;

interface ProviderConfig {
  type: AIProviderType;
  displayName: string;
  placeholder: string;
  helpText: string;
  instance: IAIProvider;
}

const PROVIDERS: ProviderConfig[] = [
  {
    type: 'openai',
    displayName: 'OpenAI',
    placeholder: 'sk-...',
    helpText: 'Get your API key from platform.openai.com. Uses gpt-4o-mini.',
    instance: AIProviderFactory.get('openai'),
  },
  {
    type: 'anthropic',
    displayName: 'Anthropic (Claude)',
    placeholder: 'sk-ant-...',
    helpText: 'Get your API key from console.anthropic.com. Uses claude-haiku.',
    instance: AIProviderFactory.get('anthropic'),
  },
  {
    type: 'gemini',
    displayName: 'Google Gemini',
    placeholder: 'AIza...',
    helpText: 'Get your API key from aistudio.google.com. Uses gemini-1.5-flash.',
    instance: AIProviderFactory.get('gemini'),
  },
];

export default function AISetupScreen(): React.JSX.Element {
  const theme  = useTheme();
  const styles = makeStyles(theme);
  const nav    = useNavigation<Nav>();

  const [configured, setConfigured] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    anthropic: false,
    gemini: false,
  });
  const [apiKeys, setApiKeys] = useState<Record<AIProviderType, string>>({
    openai: '', anthropic: '', gemini: '',
  });
  const [busy, setBusy] = useState<AIProviderType | null>(null);

  // Custom assistant persona
  const [assistantName, setAssistantName]     = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [personaSaved, setPersonaSaved]       = useState(false);

  const loadConfigured = useCallback(async () => {
    const results = await Promise.all(PROVIDERS.map((p) => p.instance.isConfigured()));
    setConfigured({ openai: results[0]!, anthropic: results[1]!, gemini: results[2]! });
  }, []);

  useEffect(() => {
    void loadConfigured();
    setAssistantName(PreferencesStore.getString(PREF_KEYS.AI_ASSISTANT_NAME) ?? '');
    setAssistantPrompt(PreferencesStore.getString(PREF_KEYS.AI_ASSISTANT_SYSTEM_PROMPT) ?? '');
  }, [loadConfigured]);

  const handleSavePersona = (): void => {
    const name   = assistantName.trim();
    const prompt = assistantPrompt.trim();
    PreferencesStore.setString(PREF_KEYS.AI_ASSISTANT_NAME, name || 'Assistant');
    PreferencesStore.setString(PREF_KEYS.AI_ASSISTANT_SYSTEM_PROMPT, prompt || DEFAULT_SYSTEM_PROMPT);
    setPersonaSaved(true);
    setTimeout(() => setPersonaSaved(false), 2000);
  };

  const handleClearPersona = (): void => {
    PreferencesStore.delete(PREF_KEYS.AI_ASSISTANT_NAME);
    PreferencesStore.delete(PREF_KEYS.AI_ASSISTANT_SYSTEM_PROMPT);
    setAssistantName('');
    setAssistantPrompt('');
  };

  const handleSave = async (provider: ProviderConfig): Promise<void> => {
    const key = apiKeys[provider.type].trim();
    if (!key) { Alert.alert('Enter a key first'); return; }

    setBusy(provider.type);
    try {
      const valid = await provider.instance.validateKey(key);
      if (!valid) {
        Alert.alert('Invalid Key', 'The API key could not be validated. Check it and try again.');
        return;
      }
      await provider.instance.storeKey(key);
      setApiKeys((prev) => ({ ...prev, [provider.type]: '' }));
      setConfigured((prev) => ({ ...prev, [provider.type]: true }));
      Alert.alert('Saved', `${provider.displayName} API key stored securely in Android Keystore.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save key.');
    } finally {
      setBusy(null);
    }
  };

  const handleClear = (provider: ProviderConfig): void => {
    Alert.alert(`Clear ${provider.displayName} key?`, 'You will not be able to use this provider until you add a new key.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: (): void => {
          void provider.instance.clearKey().then(() => {
            setConfigured((prev) => ({ ...prev, [provider.type]: false }));
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => nav.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.back, { color: theme.colors.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>AI Provider</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}>
          Bring Your Own Key (BYOK). Your API key is stored locally in Android Keystore.
          GuardianCircle never sees it. Requests go directly from your device to the provider.
        </Text>

        {/* ── Custom assistant persona ─────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.providerName, { color: theme.colors.onSurface, marginBottom: 4 }]}>
            Assistant persona
          </Text>
          <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
            Give your assistant a name and a custom role — e.g. "Yoga Coach" with a prompt that explains its specialty.
            Leave blank to use the default general-purpose assistant.
          </Text>

          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>Name</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.background }]}
            placeholder="e.g. Yoga Coach"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={assistantName}
            onChangeText={setAssistantName}
            maxLength={40}
            accessibilityLabel="Assistant name"
          />

          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>System prompt</Text>
          <TextInput
            style={[styles.input, styles.promptInput, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.background }]}
            placeholder={`e.g. You are a friendly yoga instructor. Help beginners learn poses, breathing, and routines. Keep advice safe and suitable for all fitness levels.`}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={assistantPrompt}
            onChangeText={setAssistantPrompt}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            accessibilityLabel="System prompt"
          />

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: personaSaved ? '#4CAF50' : theme.colors.primary }]}
              onPress={handleSavePersona}
              accessibilityRole="button"
              accessibilityLabel="Save assistant persona"
            >
              <Text style={styles.saveBtnText}>{personaSaved ? 'Saved ✓' : 'Save persona'}</Text>
            </TouchableOpacity>
            {(assistantName || assistantPrompt) && (
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.colors.danger }]}
                onPress={handleClearPersona}
                accessibilityRole="button"
                accessibilityLabel="Reset to default"
              >
                <Text style={[styles.clearBtnText, { color: theme.colors.danger }]}>Reset</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {PROVIDERS.map((provider) => (
          <View key={provider.type} style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.providerName, { color: theme.colors.onSurface }]}>
                {provider.displayName}
              </Text>
              {configured[provider.type] && (
                <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                  <Text style={styles.badgeText}>Configured</Text>
                </View>
              )}
            </View>

            <Text style={[styles.helpText, { color: theme.colors.onSurfaceVariant }]}>
              {provider.helpText}
            </Text>

            <TextInput
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.background }]}
              placeholder={provider.placeholder}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={apiKeys[provider.type]}
              onChangeText={(text) => setApiKeys((prev) => ({ ...prev, [provider.type]: text }))}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={`${provider.displayName} API key`}
            />

            <View style={styles.cardActions}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.colors.primary }, (busy === provider.type || !apiKeys[provider.type].trim()) && { opacity: 0.5 }]}
                onPress={() => { void handleSave(provider); }}
                disabled={busy === provider.type || !apiKeys[provider.type].trim()}
                accessibilityRole="button"
                accessibilityLabel={`Save ${provider.displayName} key`}
              >
                {busy === provider.type
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Validate & Save</Text>
                }
              </TouchableOpacity>

              {configured[provider.type] && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: theme.colors.danger }]}
                  onPress={() => handleClear(provider)}
                  accessibilityRole="button"
                  accessibilityLabel={`Clear ${provider.displayName} key`}
                >
                  <Text style={[styles.clearBtnText, { color: theme.colors.danger }]}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
    },
    back: { fontSize: 17 },
    title: { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    content: { padding: theme.spacing.md, paddingBottom: 40 },
    intro: { fontSize: 14, lineHeight: 20, marginBottom: theme.spacing.lg },
    card: { borderRadius: theme.radius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    providerName: { fontSize: 16, fontWeight: '700' },
    badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    helpText: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
    fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, marginTop: 8 },
    input: {
      borderWidth: 1, borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
      fontSize: 14, fontFamily: 'monospace', marginBottom: 12,
    },
    promptInput: {
      fontFamily: undefined, fontSize: 13, minHeight: 96,
    },
    cardActions: { flexDirection: 'row', gap: 8 },
    saveBtn: { flex: 1, borderRadius: theme.radius.md, paddingVertical: 10, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    clearBtn: { borderWidth: 1, borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
    clearBtnText: { fontSize: 14, fontWeight: '600' },
  });
}
