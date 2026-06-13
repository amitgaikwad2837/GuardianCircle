import type { IAIProvider, AIProviderType } from '../domain/interfaces/IAIProvider';
import { OpenAIProvider } from '../infrastructure/providers/OpenAIProvider';
import { AnthropicProvider } from '../infrastructure/providers/AnthropicProvider';
import { GeminiProvider } from '../infrastructure/providers/GeminiProvider';

const PROVIDERS: Record<AIProviderType, IAIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
};

export const AIProviderFactory = {
  get(type: AIProviderType): IAIProvider {
    return PROVIDERS[type];
  },

  getAll(): IAIProvider[] {
    return Object.values(PROVIDERS);
  },

  async getFirstAvailable(): Promise<IAIProvider | null> {
    for (const provider of Object.values(PROVIDERS)) {
      if (await provider.isConfigured()) {return provider;}
    }
    return null;
  },
};
