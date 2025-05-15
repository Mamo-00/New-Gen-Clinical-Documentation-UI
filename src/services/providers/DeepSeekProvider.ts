import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with DeepSeek API for text generation
 */
export class DeepSeekProvider implements BaseAIProvider {
  private static instance: DeepSeekProvider;
  private apiKey: string = '';
  private modelId: string = 'deepseek-chat';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 1000,
    endpoint: 'https://api.deepseek.com/v1'
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of DeepSeekProvider
   */
  public static getInstance(): DeepSeekProvider {
    if (!DeepSeekProvider.instance) {
      DeepSeekProvider.instance = new DeepSeekProvider();
    }
    return DeepSeekProvider.instance;
  }

  /**
   * Initialize the DeepSeek service with API key and configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'deepseek-chat';
    if (!this.apiKey) {
      console.warn('No API key provided to DeepSeek provider. API calls will fail.');
      this.initialized = false;
      return;
    }
    this.initialized = true;
  }

  /**
   * Generate text using DeepSeek API
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('DeepSeek provider not initialized with API key');
    }

    try {
      const endpoint = `${this.config.endpoint}/chat/completions`;
      
      // Prepare request payload
      const payload = {
        model: this.modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || this.config.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.maxTokens || 1000,
        top_p: options?.topP || 1,
        stream: options?.streamResponse || false,
        stop: options?.stopSequences || undefined
      };

      // Call the DeepSeek API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(errorResponse.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from the API response
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      return handleProviderError(error, 'DeepSeek');
    }
  }

  /**
   * Check if the provider is properly initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get available model options for this provider
   */
  public static getModelOptions() {
    return [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', category: 'DeepSeek' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', category: 'DeepSeek' },
      { id: 'deepseek-lite', name: 'DeepSeek Lite', category: 'DeepSeek' }
    ];
  }
} 