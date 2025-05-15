export * from './BaseAIProvider';
export * from './OpenAIProvider';
export * from './DeepSeekProvider';
export * from './AnthropicProvider';
export * from './LlamaProvider';
export * from './OllamaProvider';
export * from './GeminiProvider';

// Add HuggingFace provider as a direct API option instead of via the InferenceClient
import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError } from './BaseAIProvider';

/**
 * Service for interfacing with Hugging Face API directly for text generation
 */
export class HuggingFaceProvider implements BaseAIProvider {
  private static instance: HuggingFaceProvider;
  private apiKey: string = '';
  private modelId: string = 'mistralai/Mistral-7B-Instruct-v0.2';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'mistralai/Mistral-7B-Instruct-v0.2',
    temperature: 0.7,
    maxTokens: 1000,
    task: 'text-generation',
    endpoint: 'https://api-inference.huggingface.co/models'
  };
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of HuggingFaceProvider
   */
  public static getInstance(): HuggingFaceProvider {
    if (!HuggingFaceProvider.instance) {
      HuggingFaceProvider.instance = new HuggingFaceProvider();
    }
    return HuggingFaceProvider.instance;
  }

  /**
   * Initialize the HuggingFace service with API key and configuration
   */
  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'mistralai/Mistral-7B-Instruct-v0.2';
    
    if (!this.apiKey) {
      console.warn('No API key provided to HuggingFace provider. API calls will fail.');
      this.initialized = false;
      return;
    }

    this.initialized = true;
    console.log(`HuggingFace provider initialized with model: ${this.modelId}, task: ${this.config.task}`);
  }

  /**
   * Generate text using HuggingFace API directly
   */
  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('HuggingFace provider not initialized with API key');
    }

    try {
      const endpoint = `${this.config.endpoint}/${this.modelId}`;
      let payload: any;
      let responseHandler: (data: any) => string;

      if (this.config.task === 'conversational') {
        // Conversation API format
        payload = {
          inputs: {
            text: prompt
          },
          parameters: {
            temperature: options?.temperature || this.config.temperature || 0.7,
            max_new_tokens: options?.maxTokens || this.config.maxTokens || 1000,
            return_full_text: false,
            do_sample: true,
            top_p: options?.topP || 0.9,
            top_k: options?.topK || 50
          }
        };
        responseHandler = (data) => data.generated_text || '';
      } else {
        // Text generation API format
        payload = {
          inputs: prompt,
          parameters: {
            temperature: options?.temperature || this.config.temperature || 0.7,
            max_new_tokens: options?.maxTokens || this.config.maxTokens || 1000,
            return_full_text: false,
            do_sample: true,
            top_p: options?.topP || 0.9,
            top_k: options?.topK || 50
          }
        };
        responseHandler = (data) => {
          if (Array.isArray(data) && data.length > 0) {
            return data[0].generated_text || '';
          }
          return data.generated_text || '';
        };
      }

      // Call the HuggingFace API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      return responseHandler(data);
    } catch (error) {
      return handleProviderError(error, 'HuggingFace');
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
      { id: 'mistralai/Mistral-7B-Instruct-v0.2', name: 'Mistral 7B Instruct v0.2', category: 'HuggingFace' },
      { id: 'meta-llama/Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B Instruct', category: 'HuggingFace' },
      { id: 'Qwen/Qwen2.5-7B-Instruct', name: 'Qwen 2.5 7B Instruct', category: 'HuggingFace' },
      { id: 'nvidia/Llama-3_1-Nemotron-Ultra-253B-v1', name: 'Llama 3.1 Nemotron Ultra 253B', category: 'HuggingFace' },
      { id: 'deepseek-ai/DeepSeek-Prover-V2-671B', name: 'DeepSeek Prover 671B', category: 'HuggingFace' },
      { id: 'unsloth/DeepSeek-R1-Distill-Llama-70B', name: 'DeepSeek R1 Distill Llama 70B', category: 'HuggingFace' }
    ];
  }
}

// Define a map of provider IDs to their implementation classes
export enum AIProviderType {
  HUGGINGFACE = 'huggingface',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  LLAMA = 'llama',
  OLLAMA = 'ollama',
  GEMINI = 'gemini',
  LOCAL = 'local' // Keep local inference as an option
}

// Provider display names
export const AI_PROVIDER_NAMES = {
  [AIProviderType.HUGGINGFACE]: 'HuggingFace API',
  [AIProviderType.OPENAI]: 'OpenAI API',
  [AIProviderType.ANTHROPIC]: 'Anthropic Claude API',
  [AIProviderType.DEEPSEEK]: 'DeepSeek API',
  [AIProviderType.LLAMA]: 'Meta Llama API',
  [AIProviderType.OLLAMA]: 'Ollama API',
  [AIProviderType.GEMINI]: 'Google Gemini API',
  [AIProviderType.LOCAL]: 'Lokal inferens'
}; 