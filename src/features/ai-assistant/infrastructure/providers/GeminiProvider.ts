import type { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from '../../domain/interfaces/IAIProvider';
import { SecureStore } from '@core/storage/secure/SecureStore';

const KEY_ALIAS = 'ai_gemini_key';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export class GeminiProvider implements IAIProvider {
  readonly type = 'gemini' as const;
  readonly displayName = 'Google Gemini';

  async isConfigured(): Promise<boolean> {
    return SecureStore.exists(KEY_ALIAS);
  }

  async isAvailable(): Promise<boolean> {
    return this.isConfigured();
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const key = await this.getKey();

    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const response = await fetch(`${BASE_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: options?.systemPrompt
          ? { parts: [{ text: options.systemPrompt }] }
          : undefined,
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? 1000,
          temperature: options?.temperature ?? 0.7,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.status}`);
    }

    const data = await response.json() as {
      candidates: [{ content: { parts: [{ text: string }] } }];
      usageMetadata: { promptTokenCount: number; candidatesTokenCount: number };
    };

    return {
      content: data.candidates[0]?.content.parts[0]?.text ?? '',
      usage: {
        inputTokens: data.usageMetadata.promptTokenCount,
        outputTokens: data.usageMetadata.candidatesTokenCount,
      },
    };
  }

  async validateKey(key: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, 8000);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
        { signal: controller.signal },
      );
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async storeKey(key: string): Promise<void> {
    await SecureStore.set(KEY_ALIAS, key);
  }

  async clearKey(): Promise<void> {
    await SecureStore.delete(KEY_ALIAS);
  }

  private async getKey(): Promise<string> {
    const key = await SecureStore.get(KEY_ALIAS);
    if (!key) {throw new Error('Gemini API key not configured.');}
    return key;
  }
}
