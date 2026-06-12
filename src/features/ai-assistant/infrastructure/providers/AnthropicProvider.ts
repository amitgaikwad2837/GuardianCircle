import type { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from '../../domain/interfaces/IAIProvider';
import { SecureStore } from '@core/storage/secure/SecureStore';

const KEY_ALIAS = 'ai_anthropic_key';

export class AnthropicProvider implements IAIProvider {
  readonly type = 'anthropic' as const;
  readonly displayName = 'Anthropic (Claude)';

  async isConfigured(): Promise<boolean> {
    return SecureStore.exists(KEY_ALIAS);
  }

  async isAvailable(): Promise<boolean> {
    return this.isConfigured();
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const key = await this.getKey();
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: options?.maxTokens ?? 1000,
        system: options?.systemPrompt ?? 'You are a personal safety assistant.',
        messages: messages.filter((m) => m.role !== 'system'),
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`);
    }

    const data = await response.json() as {
      content: [{ text: string }];
      usage: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text ?? '',
      usage: {
        inputTokens: data.usage.input_tokens,
        outputTokens: data.usage.output_tokens,
      },
    };
  }

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        signal: (AbortSignal as any).timeout(8000),
      });
      return response.ok;
    } catch {
      return false;
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
    if (!key) throw new Error('Anthropic API key not configured.');
    return key;
  }
}
