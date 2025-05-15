import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with Google's Gemini API for text generation
 */
export class GeminiProvider implements BaseAIProvider {
  private static instance: GeminiProvider;
  private apiKey: string = '';
  private modelId: string = 'gemini-2.5-flash-preview-04-17';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'gemini-2.5-flash-preview-04-17',
    temperature: 0.7,
    maxTokens: 1000,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta'
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of GeminiProvider
   */
  public static getInstance(): GeminiProvider {
    if (!GeminiProvider.instance) {
      GeminiProvider.instance = new GeminiProvider();
    }
    return GeminiProvider.instance;
  }

  /**
   * Initialize the Gemini service with API key and configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'gemini-2.5-flash-preview-04-17';
    if (!this.apiKey) {
      console.warn('No API key provided to Gemini provider. API calls will fail.');
      this.initialized = false;
      return;
    }
    this.initialized = true;
  }

  /**
   * Generate text using Gemini API
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('Gemini provider not initialized with API key');
    }

    try {
      // Map model ID to actual Gemini model name
      const mappedModelId = this.mapModelIdToApiModel(this.modelId);
      
      // Prepare request payload for Gemini
      const payload = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: options?.temperature || this.config.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || this.config.maxTokens || 1000,
          topP: options?.topP || 0.95,
          topK: options?.topK || 40,
          stopSequences: options?.stopSequences || []
        }
      };

      // Construct the API endpoint URL
      const endpoint = `${this.config.endpoint}/models/${mappedModelId}:generateContent?key=${this.apiKey}`;
      
      // Call the Gemini API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      // Extract text from the Gemini API response
      if (data.candidates && data.candidates.length > 0 && 
          data.candidates[0].content && 
          data.candidates[0].content.parts && 
          data.candidates[0].content.parts.length > 0) {
        return data.candidates[0].content.parts[0].text || '';
      }
      
      throw new Error('Unexpected response format from Gemini API');
    } catch (error) {
      return handleProviderError(error, 'Gemini');
    }
  }

  /**
   * Maps the friendly model ID to the actual API model name
   */
  private mapModelIdToApiModel(modelId: string): string {
    const modelMap: {[key: string]: string} = {
      'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash-preview-04-17',
      'gemini-2.0-flash': 'gemini-2.0-flash',
      'gemini-2.0-flash-experimental': 'gemini-2.0-flash-experimental',
      'gemini-2.0-flash-lite': 'gemini-2.0-flash-lite',
      'gemini-1.5-flash': 'gemini-1.5-flash',
      'gemma-3': 'gemma-3'
    };

    return modelMap[modelId] || modelId;
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
      { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash Preview 04-17', category: 'Google' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', category: 'Google' },
      { id: 'gemini-2.0-flash-experimental', name: 'Gemini 2.0 Flash Experimental', category: 'Google' },
      { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', category: 'Google' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', category: 'Google' },
      { id: 'gemma-3', name: 'Gemma 3', category: 'Google' }
    ];
  }
} 