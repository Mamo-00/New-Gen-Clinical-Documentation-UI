import { AIProviderType, AIProviderConfig, BaseAIProvider, createDiagnosisPrompt } from './providers';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { DeepSeekProvider } from './providers/DeepSeekProvider';
import { LlamaProvider } from './providers/LlamaProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { HuggingFaceProvider } from './providers/index';
import { ModelConfig, ModelService } from './ModelServiceFactory';

/**
 * Service for managing multiple AI providers through a unified interface
 */
export class MultiProviderService implements ModelService {
  private static instance: MultiProviderService;
  private providers: Map<AIProviderType, BaseAIProvider> = new Map();
  private activeProvider: AIProviderType = AIProviderType.HUGGINGFACE; // Default provider
  private config: ModelConfig = {
    modelId: 'mistralai/Mistral-7B-Instruct-v0.2',
    temperature: 0.7,
    maxTokens: 1000,
    apiKey: ''
  };

  private constructor() {
    // Initialize provider instances
    this.providers.set(AIProviderType.HUGGINGFACE, HuggingFaceProvider.getInstance());
    this.providers.set(AIProviderType.OPENAI, OpenAIProvider.getInstance());
    this.providers.set(AIProviderType.ANTHROPIC, AnthropicProvider.getInstance());
    this.providers.set(AIProviderType.DEEPSEEK, DeepSeekProvider.getInstance());
    this.providers.set(AIProviderType.LLAMA, LlamaProvider.getInstance());
    this.providers.set(AIProviderType.OLLAMA, OllamaProvider.getInstance());
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): MultiProviderService {
    if (!MultiProviderService.instance) {
      MultiProviderService.instance = new MultiProviderService();
    }
    return MultiProviderService.instance;
  }

  /**
   * Initialize the service with a specific provider and configuration
   */
  public async initialize(config: ModelConfig & { provider?: AIProviderType }): Promise<void> {
    // Store the configuration
    this.config = { ...this.config, ...config };
    
    // Set active provider if specified
    if (config.provider) {
      this.activeProvider = config.provider;
    }

    // Get the active provider instance
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not found`);
    }

    console.log('apiKey: ',this.config.apiKey);
    console.log('modelId: ',this.config.modelId);
    console.log('temperature: ',this.config.temperature);
    console.log('maxTokens: ',this.config.maxTokens);
    console.log('task: ',this.config.task);

    // Initialize the provider with the configuration
    await provider.initialize({
      apiKey: this.config.apiKey || '0a79ec08-ef67-48f2-b808-c12ab69ace33',
      modelId: this.config.modelId,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      task: this.config.task
    });

    console.log(`MultiProviderService initialized with provider: ${this.activeProvider}, model: ${this.config.modelId}`);
  }

  /**
   * Generate a diagnosis based on the provided text descriptions
   */
  public async generateDiagnosis(makroText: string, mikroText: string): Promise<string> {
    const provider = this.providers.get(this.activeProvider);
    if (!provider) {
      throw new Error(`Provider ${this.activeProvider} not found`);
    }

    if (!provider.isInitialized()) {
      throw new Error(`Provider ${this.activeProvider} is not initialized`);
    }

    // Create a detailed prompt for diagnosis generation
    const prompt = createDiagnosisPrompt(makroText, mikroText);

    // Generate text using the active provider
    try {
      return await provider.generateText(prompt, {
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });
    } catch (error) {
      console.error(`Error generating diagnosis with ${this.activeProvider}:`, error);
      if (error instanceof Error) {
        return `Feil ved generering av diagnose via ${this.activeProvider}: ${error.message}`;
      }
      return `Feil ved generering av diagnose via ${this.activeProvider}`;
    }
  }

  /**
   * Check if the service is properly initialized
   */
  public isInitialized(): boolean {
    const provider = this.providers.get(this.activeProvider);
    return !!provider && provider.isInitialized();
  }

  /**
   * Get the current active provider type
   */
  public getActiveProvider(): AIProviderType {
    return this.activeProvider;
  }

  /**
   * Set the active provider type
   */
  public setActiveProvider(providerType: AIProviderType): void {
    this.activeProvider = providerType;
  }

  /**
   * Get available models for the current provider
   */
  public getAvailableModels() {
    switch (this.activeProvider) {
      case AIProviderType.HUGGINGFACE:
        return HuggingFaceProvider.getModelOptions();
      case AIProviderType.OPENAI:
        return OpenAIProvider.getModelOptions();
      case AIProviderType.ANTHROPIC:
        return AnthropicProvider.getModelOptions();
      case AIProviderType.DEEPSEEK:
        return DeepSeekProvider.getModelOptions();
      case AIProviderType.LLAMA:
        return LlamaProvider.getModelOptions();
      case AIProviderType.OLLAMA:
        return OllamaProvider.getModelOptions();
      default:
        return [];
    }
  }

  /**
   * Get all available models across all providers
   */
  public static getAllAvailableModels() {
    return [
      ...HuggingFaceProvider.getModelOptions(),
      ...OpenAIProvider.getModelOptions(),
      ...AnthropicProvider.getModelOptions(),
      ...DeepSeekProvider.getModelOptions(),
      ...LlamaProvider.getModelOptions(),
      ...OllamaProvider.getModelOptions()
    ];
  }
}

export default MultiProviderService; 