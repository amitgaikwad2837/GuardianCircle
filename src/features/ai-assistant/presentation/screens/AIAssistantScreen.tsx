import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@core/theme/ThemeProvider';
import { AIProviderFactory } from '../../application/AIProviderFactory';
import type { ChatMessage } from '../../domain/interfaces/IAIProvider';
import type { SettingsStackParams } from '@core/navigation/NavigationTypes';

type Nav = NativeStackNavigationProp<SettingsStackParams>;

const SYSTEM_PROMPT = `You are a personal safety assistant integrated into GuardianCircle, a privacy-first safety app. Help users with safety planning, understanding their app features, and general well-being advice. Never encourage illegal activities. If the user indicates they are in immediate danger, remind them to press the SOS button.`;

interface Message extends ChatMessage {
  id: string;
  isLoading?: boolean;
}

export default function AIAssistantScreen(): React.JSX.Element {
  const theme  = useTheme();
  const styles = makeStyles(theme);
  const nav    = useNavigation<Nav>();
  const listRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [isBusy, setIsBusy]     = useState(false);
  const [noProvider, setNoProvider] = useState(false);

  const handleSend = async (): Promise<void> => {
    const text = input.trim();
    if (!text || isBusy) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    const loadingMsg: Message = { id: 'loading', role: 'assistant', content: '', isLoading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsBusy(true);

    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const provider = await AIProviderFactory.getFirstAvailable();
      if (!provider) {
        setNoProvider(true);
        setMessages((prev) => prev.filter((m) => m.id !== 'loading'));
        return;
      }

      const history: ChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
      history.push({ role: 'user', content: text });

      const response = await provider.chat(history, { systemPrompt: SYSTEM_PROMPT, maxTokens: 600 });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== 'loading'), assistantMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: 'err_' + Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== 'loading'), errMsg]);
    } finally {
      setIsBusy(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
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
        <Text style={[styles.title, { color: theme.colors.onBackground }]}>AI Assistant</Text>
        <TouchableOpacity
          onPress={() => nav.navigate('AIAssistant')}
          accessibilityRole="button"
          accessibilityLabel="AI settings"
        >
          <Text style={[styles.settingsBtn, { color: theme.colors.primary }]}>Setup</Text>
        </TouchableOpacity>
      </View>

      {noProvider && (
        <View style={[styles.noProviderBanner, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.noProviderText, { color: theme.colors.onSurface }]}>
            No AI provider configured.{' '}
            <Text
              style={{ color: theme.colors.primary, textDecorationLine: 'underline' }}
              onPress={() => nav.navigate('AIAssistant')}
            >
              Set up BYOK
            </Text>
          </Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.messages}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
              Safety Assistant
            </Text>
            <Text style={[styles.emptyBody, { color: theme.colors.onSurfaceVariant }]}>
              Ask me about safety planning, app features, or general advice. Your conversation stays on your device.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.role === 'user'
              ? [styles.bubbleUser, { backgroundColor: theme.colors.primary }]
              : [styles.bubbleAssistant, { backgroundColor: theme.colors.surface }],
          ]}>
            {item.isLoading
              ? <ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
              : (
                <Text style={[
                  styles.bubbleText,
                  { color: item.role === 'user' ? '#fff' : theme.colors.onSurface },
                ]}>
                  {item.content}
                </Text>
              )
            }
          </View>
        )}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputRow, { borderTopColor: theme.colors.divider, backgroundColor: theme.colors.background }]}>
          <TextInput
            style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.onSurface, backgroundColor: theme.colors.surface }]}
            placeholder="Ask anything…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={input}
            onChangeText={setInput}
            multiline
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
            accessibilityLabel="Message input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: theme.colors.primary }, (isBusy || !input.trim()) && { opacity: 0.4 }]}
            onPress={handleSend}
            disabled={isBusy || !input.trim()}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider,
    },
    back: { fontSize: 17 },
    title: { ...theme.typography.titleMedium, flex: 1, textAlign: 'center' },
    settingsBtn: { fontSize: 15, fontWeight: '500' },
    noProviderBanner: { padding: 12, alignItems: 'center' },
    noProviderText: { fontSize: 14 },
    messages: { padding: theme.spacing.md, paddingBottom: 8 },
    empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: theme.spacing.xl },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
    emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
    bubble: { maxWidth: '80%', borderRadius: theme.radius.lg, padding: 12, marginBottom: 8 },
    bubbleUser: { alignSelf: 'flex-end' },
    bubbleAssistant: { alignSelf: 'flex-start' },
    bubbleText: { fontSize: 15, lineHeight: 22 },
    inputRow: {
      flexDirection: 'row', alignItems: 'flex-end',
      padding: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 8,
    },
    input: {
      flex: 1, borderWidth: 1, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 8,
      fontSize: 15, maxHeight: 100,
    },
    sendBtn: {
      width: 36, height: 36, borderRadius: 18,
      alignItems: 'center', justifyContent: 'center',
    },
    sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  });
}
