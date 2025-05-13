import AIService from './AIService';
import LLMService from './LLMService';
import MultiProviderService from './MultiProviderService';
import { AIProviderType } from './providers';

// Common interface for model configuration
export interface ModelConfig {
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  task?: 'text-generation' | 'conversational';
  provider?: AIProviderType; // New field for provider selection
}

// Common interface for model services
export interface ModelService {
  initialize(config: ModelConfig): Promise<void> | void;
  generateDiagnosis(makroText: string, mikroText: string): Promise<string>;
  isInitialized(): boolean;
}

// Adapter for AIService to implement ModelService (legacy HuggingFace client)
class RemoteModelAdapter implements ModelService {
  private service: AIService;

  constructor() {
    this.service = AIService.getInstance();
  }

  initialize(config: ModelConfig): void {
    this.service.initialize({
      apiKey: config.apiKey || '',
      modelId: config.modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      task: config.task
    });
  }

  async generateDiagnosis(makroText: string, mikroText: string): Promise<string> {
    try {
      return await this.service.generateDiagnosis(makroText, mikroText);
    } catch (error) {
      if (error instanceof Error && 
          (error.message.includes('429') || 
           error.message.includes('quota') || 
           error.message.includes('limit'))) {
        throw new Error('API limit reached. Consider switching to local inference mode or upgrade your plan.');
      }
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.service.isInitialized();
  }
}

// Adapter for LLMService to implement ModelService
class LocalModelAdapter implements ModelService {
  private service: LLMService;

  constructor() {
    this.service = LLMService.getInstance();
  }

  async initialize(config: ModelConfig): Promise<void> {
    await this.service.initialize({
      model: config.modelId,
      temperature: config.temperature,
      max_length: config.maxTokens
    });
  }

  async generateDiagnosis(makroText: string, mikroText: string): Promise<string> {
    return await this.service.generateDiagnosis(makroText, mikroText);
  }

  isInitialized(): boolean {
    return this.service.isModelLoaded();
  }
}

// Adapter for MultiProviderService
class DirectProviderAdapter implements ModelService {
  private service: MultiProviderService;

  constructor() {
    this.service = MultiProviderService.getInstance();
  }

  async initialize(config: ModelConfig): Promise<void> {
    await this.service.initialize({
      modelId: config.modelId,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      apiKey: config.apiKey,
      task: config.task,
      provider: config.provider
    });
  }

  async generateDiagnosis(makroText: string, mikroText: string): Promise<string> {
    return await this.service.generateDiagnosis(makroText, mikroText);
  }

  isInitialized(): boolean {
    return this.service.isInitialized();
  }
}

// Enum for service types
export enum ModelServiceType {
  REMOTE = 'remote',   // Legacy HuggingFace client
  LOCAL = 'local',     // Local transformers.js
  DIRECT = 'direct'    // Direct provider API integration
}

// Factory class to create and manage model services
export class ModelServiceFactory {
  private static remoteService: RemoteModelAdapter;
  private static localService: LocalModelAdapter;
  private static directService: DirectProviderAdapter;
  private static activeService: ModelService;
  private static activeType: ModelServiceType = ModelServiceType.REMOTE;

  // Get the singleton instance of the appropriate service
  static getService(type?: ModelServiceType): ModelService {
    if (type) {
      this.activeType = type;
    }

    if (this.activeType === ModelServiceType.REMOTE) {
      if (!this.remoteService) {
        this.remoteService = new RemoteModelAdapter();
      }
      this.activeService = this.remoteService;
    } else if (this.activeType === ModelServiceType.LOCAL) {
      if (!this.localService) {
        this.localService = new LocalModelAdapter();
      }
      this.activeService = this.localService;
    } else if (this.activeType === ModelServiceType.DIRECT) {
      if (!this.directService) {
        this.directService = new DirectProviderAdapter();
      }
      this.activeService = this.directService;
    }

    return this.activeService;
  }

  // Try with remote first, fall back to local if remote fails
  static async getServiceWithFallback(config: ModelConfig): Promise<ModelService> {
    try {
      // Try remote service first
      if (this.activeType === ModelServiceType.REMOTE || this.activeType === ModelServiceType.DIRECT) {
        const service = this.getService(this.activeType);
        await service.initialize(config);
        
        // Verify it works with a simple test
        // This will throw if there's an API limit issue
        if (config.apiKey) {
          try {
            await service.generateDiagnosis('test', 'test');
            return service;
          } catch (error) {
            console.warn(`${this.activeType} service failed, falling back to local:`, error);
            // Fall back to local service
            const localService = this.getService(ModelServiceType.LOCAL);
            await localService.initialize(config);
            return localService;
          }
        }
      }
      
      // No API key or direct fallback, use local service
      const localService = this.getService(ModelServiceType.LOCAL);
      await localService.initialize(config);
      return localService;
    } catch (error) {
      console.error('Error initializing services:', error);
      throw error;
    }
  }

  // Get the current active service type
  static getActiveServiceType(): ModelServiceType {
    return this.activeType;
  }

  // Explicitly switch to a different service type
  static switchServiceType(type: ModelServiceType): ModelService {
    return this.getService(type);
  }
}

export default ModelServiceFactory; 