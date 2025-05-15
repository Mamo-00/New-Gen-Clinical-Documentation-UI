import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with OpenAI API for text generation
 */
export class OpenAIProvider implements BaseAIProvider {
  private static instance: OpenAIProvider;
  private apiKey: string = '';
  private modelId: string = 'gpt-3.5-turbo';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    endpoint: 'https://api.openai.com/v1'
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of OpenAIProvider
   */
  public static getInstance(): OpenAIProvider {
    if (!OpenAIProvider.instance) {
      OpenAIProvider.instance = new OpenAIProvider();
    }
    return OpenAIProvider.instance;
  }

  /**
   * Initialize the OpenAI service with API key and configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'gpt-3.5-turbo';
    if (!this.apiKey) {
      console.warn('No API key provided to OpenAI provider. API calls will fail.');
      this.initialized = false;
      return;
    }
    this.initialized = true;
  }

  /**
   * Generate text using OpenAI API
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('OpenAI provider not initialized with API key');
    }

    try {
      // Prepare request payload for OpenAI
      const payload = {
        model: this.modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || this.config.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.maxTokens || 1000,
        top_p: options?.topP || 1,
        stream: options?.streamResponse || false,
        stop: options?.stopSequences || undefined
      };

      // Call the proxy endpoint instead of directly calling OpenAI
      // This avoids CORS issues in the browser
      const proxyEndpoint = '/api/openai'; // This will be served by your local proxy server
      const response = await fetch(proxyEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: this.config.endpoint,
          apiKey: this.apiKey,
          organizationId: this.config.organizationId,
          payload
        })
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(errorResponse.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from the API response
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      return handleProviderError(error, 'OpenAI');
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
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', category: 'OpenAI' },
      { id: 'gpt-4o', name: 'GPT-4o', category: 'OpenAI' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', category: 'OpenAI' },
      { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision', category: 'OpenAI' }
    ];
  }
} 