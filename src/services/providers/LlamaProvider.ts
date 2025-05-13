import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with Meta Llama API for text generation
 */
export class LlamaProvider implements BaseAIProvider {
  private static instance: LlamaProvider;
  private apiKey: string = '0a79ec08-ef67-48f2-b808-c12ab69ace33';
  private modelId: string = 'Llama-3.1-70B-Instruct';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'Llama-3.1-70B-Instruct',
    temperature: 0.6,
    maxTokens: 4096,
    endpoint: 'https://llmapi.com/v1' // Example endpoint, this may need to be adjusted
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of LlamaProvider
   */
  public static getInstance(): LlamaProvider {
    if (!LlamaProvider.instance) {
      LlamaProvider.instance = new LlamaProvider();
    }
    return LlamaProvider.instance;
  }

  /**
   * Initialize the Llama service with API key and configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'Llama-3.1-70B-Instruct';
    
    if (!this.apiKey) {
      console.warn('No API key provided to Llama provider. API calls will fail.');
      this.initialized = false;
      return;
    }

    this.initialized = true;
    console.log(`Llama provider initialized with model: ${this.modelId}`);
  }

  /**
   * Generate text using Llama API
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('Llama provider not initialized with API key');
    }

    try {
      const endpoint = `${this.config.endpoint}/chat/completions`;
      
      // Prepare request payload - standard OpenAI-like format
      const payload = {
        model: this.modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature || this.config.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.maxTokens || 1000,
        top_p: options?.topP || 1,
        stream: options?.streamResponse || false
      };

      // Call the Llama API
      const response = await fetch(endpoint, {
        mode: 'no-cors',
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
      return handleProviderError(error, 'Meta Llama');
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
      { id: 'Llama-3.1-70B-Instruct', name: 'Llama 3.1 70B Instruct', category: 'Meta Llama' },
      { id: 'llama-3.1-8b-versatile', name: 'Llama 3.1 8B Versatile', category: 'Meta Llama' },
      { id: 'llama-3-70b-instruct', name: 'Llama 3 70B Instruct', category: 'Meta Llama' },
      { id: 'llama-3-8b-instruct', name: 'Llama 3 8B Instruct', category: 'Meta Llama' }
    ];
  }
} 