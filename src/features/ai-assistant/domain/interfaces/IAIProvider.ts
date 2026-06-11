export type AIProviderType = 'openai' | 'anthropic' | 'gemini';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ChatResponse {
  content: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface SafetyContext {
  userLocation?: string;
  timeOfDay?: string;
  recentIncidents?: number;
  currentActivity?: string;
}

/**
 * Core AI provider interface.
 * All providers must implement this. No GuardianCircle server involvement.
 * Requests go directly from device to provider endpoint.
 */
export interface IAIProvider {
  readonly type: AIProviderType;
  readonly displayName: string;

  isConfigured(): Promise<boolean>;
  isAvailable(): Promise<boolean>;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  validateKey(key: string): Promise<boolean>;
  storeKey(key: string): Promise<void>;
  clearKey(): Promise<void>;
}
