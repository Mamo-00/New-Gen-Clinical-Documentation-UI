import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with Anthropic Claude API for text generation
 */
export class AnthropicProvider implements BaseAIProvider {
  private static instance: AnthropicProvider;
  private apiKey: string = '';
  private modelId: string = 'claude-3-sonnet-20240229';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'claude-3-sonnet-20240229',
    temperature: 0.7,
    maxTokens: 1000,
    endpoint: 'https://api.anthropic.com/v1'
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of AnthropicProvider
   */
  public static getInstance(): AnthropicProvider {
    if (!AnthropicProvider.instance) {
      AnthropicProvider.instance = new AnthropicProvider();
    }
    return AnthropicProvider.instance;
  }

  /**
   * Initialize the Anthropic service with API key and configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'claude-3-sonnet-20240229';
    
    if (!this.apiKey) {
      console.warn('No API key provided to Anthropic provider. API calls will fail.');
      this.initialized = false;
      return;
    }

    this.initialized = true;
    console.log(`Anthropic provider initialized with model: ${this.modelId}`);
  }

  /**
   * Generate text using Anthropic API
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('Anthropic provider not initialized with API key');
    }

    try {
      const endpoint = `${this.config.endpoint}/messages`;
      
      // Prepare request payload - Anthropic uses a different format
      const payload = {
        model: this.modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || this.config.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.maxTokens || 1000,
        top_p: options?.topP || 1,
        stream: options?.streamResponse || false
      };

      // Call the Anthropic API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(errorResponse.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from the API response - Anthropic's format
      return data.content[0]?.text || '';
    } catch (error) {
      return handleProviderError(error, 'Anthropic Claude');
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
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', category: 'Anthropic' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', category: 'Anthropic' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', category: 'Anthropic' },
      { id: 'claude-instant-1.2', name: 'Claude Instant', category: 'Anthropic' }
    ];
  }
} 