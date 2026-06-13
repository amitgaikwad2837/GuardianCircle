import type { IAIProvider, ChatMessage, ChatOptions, ChatResponse } from '../../domain/interfaces/IAIProvider';
import { SecureStore } from '@core/storage/secure/SecureStore';

const KEY_ALIAS = 'ai_openai_key';

export class OpenAIProvider implements IAIProvider {
  readonly type = 'openai' as const;
  readonly displayName = 'OpenAI';

  async isConfigured(): Promise<boolean> {
    return SecureStore.exists(KEY_ALIAS);
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${await this.getKey()}` },
        signal: (AbortSignal as { timeout: (ms: number) => AbortSignal }).timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const key = await this.getKey();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: options?.systemPrompt
          ? [{ role: 'system', content: options.systemPrompt }, ...messages]
          : messages,
        max_tokens: options?.maxTokens ?? 1000,
        temperature: options?.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: [{ message: { content: string } }];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message.content ?? '',
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
    };
  }

  async validateKey(key: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, 8000);
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });
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
    if (!key) {throw new Error('OpenAI API key not configured.');}
    return key;
  }
}
