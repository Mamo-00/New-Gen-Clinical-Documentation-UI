import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with Ollama API for text generation
 */
export class OllamaProvider implements BaseAIProvider {
  private static instance: OllamaProvider;
  private apiKey: string = '';
  private modelId: string = 'llama3:latest';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'llama3:latest',
    temperature: 0.7,
    maxTokens: 4096,
    endpoint: 'http://localhost:11434' // Default local Ollama endpoint
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of OllamaProvider
   */
  public static getInstance(): OllamaProvider {
    if (!OllamaProvider.instance) {
      OllamaProvider.instance = new OllamaProvider();
    }
    return OllamaProvider.instance;
  }

  /**
   * Initialize the Ollama service with configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'llama3:latest';
    
    // Ollama doesn't require an API key for local instances,
    // but we'll support it for remote instances that might be secured
    this.initialized = true;
    console.log(`Ollama provider initialized with model: ${this.modelId}`);
  }

  /**
   * Generate text using Ollama API
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized) {
      throw new Error('Ollama provider not initialized');
    }

    try {
      // Ollama uses a direct /api/generate endpoint
      const endpoint = `${this.config.endpoint}/api/generate`;
      
      // Prepare request payload according to Ollama's API format
      const payload = {
        model: this.modelId,
        prompt: prompt,
        temperature: options?.temperature || this.config.temperature || 0.7,
        max_tokens: options?.maxTokens || this.config.maxTokens || 4096,
        top_p: options?.topP || 1,
        // Ollama-specific options
        stream: false,
        system: "You are an expert pathologist writing concise diagnostic reports in Norwegian."
      };

      console.log("Sending request to Ollama:", endpoint);
      console.log("Using model:", this.modelId);
      
      // Add authorization header if API key is provided
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      // Call the Ollama API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorResponse = await response.json().catch(() => ({ error: { message: `HTTP error ${response.status}` } }));
        throw new Error(errorResponse.error?.message || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      
      // Extract text from Ollama's response format
      return data.response || '';
    } catch (error) {
      console.error("Ollama API error:", error);
      return handleProviderError(error, 'Ollama');
    }
  }

  /**
   * List available models from Ollama
   */
  private async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.endpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to fetch models: HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.models ? data.models.map((model: any) => model.name) : [];
    } catch (error) {
      console.error("Failed to list Ollama models:", error);
      return [];
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
      { id: 'llama3:latest', name: 'Llama 3', category: 'Ollama' },
      { id: 'llama3:latest:8b', name: 'Llama 3 8B', category: 'Ollama' },
      { id: 'llama3:latest:70b', name: 'Llama 3 70B', category: 'Ollama' },
      { id: 'mistral', name: 'Mistral', category: 'Ollama' },
      { id: 'mistral:7b', name: 'Mistral 7B', category: 'Ollama' },
      { id: 'mixtral', name: 'Mixtral', category: 'Ollama' },
      { id: 'gemma:2b', name: 'Gemma 2B', category: 'Ollama' },
      { id: 'gemma:7b', name: 'Gemma 7B', category: 'Ollama' },
      { id: 'codellama', name: 'CodeLlama', category: 'Ollama' }
    ];
  }
} 