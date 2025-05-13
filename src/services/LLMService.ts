import { pipeline } from '@huggingface/transformers';

// Types for the LLM service
type ModelConfig = {
  model: string;  // Model identifier on Hugging Face
  temperature?: number;  // Control randomness (0-1)
  max_length?: number;  // Maximum length of generated text
  device?: 'cpu' | 'webgpu';  // Where to run inference
  dtype?: 'fp32' | 'fp16' | 'q8' | 'q4';  // Quantization level
};

// Define a custom pipeline type for text generation
interface TextGenerationResult {
  generated_text: string;
}

type TextGenerationFunction = (
  text: string, 
  options: any
) => Promise<TextGenerationResult | TextGenerationResult[]>;

type GenerateOptions = {
  maxLength?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
};

/**
 * Service for interacting with LLMs through Hugging Face transformers.js
 * This runs models directly in the browser without needing a backend
 */
export class LLMService {
  private static instance: LLMService;
  private textGenerationPipeline: TextGenerationFunction | null = null;
  private loadingPromise: Promise<TextGenerationFunction> | null = null;
  private pipelineInitialized: boolean = false;
  private config: ModelConfig = {
    model: 'HuggingFaceTB/SmolLM2-1.7B-Instruct:q4f16', // Default model
    temperature: 0.8,
    max_length: 2048,
    device: 'webgpu',
    dtype: 'fp32'
  };

  private constructor() {}

  /**
   * Get the singleton instance of LLMService
   */
  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  /**
   * Initialize the LLM pipeline with a specific model
   * @param config Configuration options for the model
   */
  public async initialize(config?: Partial<ModelConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    console.log('Initializing local model:', this.config.model);
    
    // Clear existing pipeline if model changed
    if (this.pipelineInitialized && this.textGenerationPipeline) {
      // If we're changing models, clear the existing pipeline
      this.textGenerationPipeline = null;
      this.pipelineInitialized = false;
    }

    // If already loading, wait for that to complete
    if (this.loadingPromise) {
      try {
        this.textGenerationPipeline = await this.loadingPromise;
      } catch (error) {
        console.error('Failed to load LLM model:', error);
        throw error;
      } finally {
        this.loadingPromise = null;
      }
      return;
    }

    // Start loading the new model
    this.loadingPromise = this.initializePipeline();
    try {
      this.textGenerationPipeline = await this.loadingPromise;
      this.pipelineInitialized = true;
      console.log('Local model loaded successfully:', this.config.model);
    } catch (error) {
      console.error('Failed to load LLM model:', error);
      throw error;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * Creates and initializes the text generation pipeline
   */
  private async initializePipeline(): Promise<TextGenerationFunction> {
    try {
      console.log(`Loading local model: ${this.config.model}`);
      // Show loading indicator for user
      document.body.style.cursor = 'wait';
      
      // Create a notification element
      const notificationId = 'model-loading-notification';
      let notification = document.getElementById(notificationId);
      
      if (!notification) {
        notification = document.createElement('div');
        notification.id = notificationId;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px';
        notification.style.backgroundColor = '#2196F3';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(notification);
      }
      
      notification.textContent = `Laster ned modell: ${this.config.model}. Dette kan ta litt tid...`;
      
      // Use pipeline with specified settings
      const pipe = await pipeline('text-generation', this.config.model, {
        device: this.config.device,
        dtype: this.config.dtype,
      }) as TextGenerationFunction;
      
      // Remove notification
      notification.textContent = `Modell lastet: ${this.config.model}`;
      setTimeout(() => {
        notification.remove();
      }, 3000);
      
      // Reset cursor
      document.body.style.cursor = 'default';
      
      return pipe;
    } catch (error: unknown) {
      console.error('Error initializing pipeline:', error);
      
      // Reset cursor and show error notification
      document.body.style.cursor = 'default';
      
      // Create an error notification
      const notificationId = 'model-error-notification';
      let notification = document.getElementById(notificationId);
      
      if (!notification) {
        notification = document.createElement('div');
        notification.id = notificationId;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px';
        notification.style.backgroundColor = '#F44336';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(notification);
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      notification.textContent = `Feil ved lasting av modell: ${errorMessage}`;
      
      setTimeout(() => {
        notification.remove();
      }, 5000);
      
      throw error;
    }
  }

  /**
   * Generate a diagnosis text based on makroskopisk and mikroskopisk descriptions
   * @param makroText The makroskopisk beskrivelse text
   * @param mikroText The mikroskopisk beskrivelse text
   * @param options Additional generation options
   * @returns Promise with the generated diagnosis text
   */
  public async generateDiagnosis(
    makroText: string,
    mikroText: string,
    options?: GenerateOptions
  ): Promise<string> {
    if (!this.textGenerationPipeline) {
      try {
        await this.initialize();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `Feil: Kunne ikke laste modellen. ${errorMessage}`;
      }
    }

    if (!this.textGenerationPipeline) {
      return 'Feil: Lokal modell kunne ikke initialiseres. Prøv å velge en annen modell eller bruk HuggingFace API.';
    }

    // Create a prompt that guides the LLM to generate an appropriate diagnosis
    const prompt = `
Du er en erfaren patolog som skal formulere en presis diagnose/konklusjon på norsk basert på makroskopiske og mikroskopiske beskrivelser.

VIKTIG INSTRUKS: Analyser nøye de faktiske funnene i den mikroskopiske og makroskopiske beskrivelsen nedenfor. Ikke gjenta eksempelet under, men lag en ny diagnose basert på de reelle funnene i denne spesifikke prøven.

Konklusjonen skal:
- Være kort og konsis med fokus på diagnosene
- Nøyaktig reflektere funnene som er beskrevet i teksten under
- Gruppere prøver med like funn (nummererte prøver med samme diagnose)
- Spesifisere vevtype, dysplasigrad, og lokalisasjon for hver gruppe av prøver viss det er relevant

Format for diagnosen:
- Start med prøvenumrene fulgt av kolon, deretter diagnosen (f.eks. "1: Tubulært adenom...")
- Angi korrekt antall lesjoner og lokalisasjon
- Inkluder kun funn som faktisk er beskrevet i prøven

Makroskopisk beskrivelse:
${makroText || 'Ingen makroskopisk beskrivelse tilgjengelig.'}

Mikroskopisk beskrivelse:
${mikroText || 'Ingen mikroskopisk beskrivelse tilgjengelig.'}

Konklusjon/Diagnose:`;

    try {
      document.body.style.cursor = 'wait';
      
      const result = await this.textGenerationPipeline(prompt, {
        max_new_tokens: options?.maxLength || this.config.max_length,
        temperature: options?.temperature || this.config.temperature,
        top_k: options?.topK || 50,
        top_p: options?.topP || 0.9,
        do_sample: true,
        num_return_sequences: 1,
      });

      document.body.style.cursor = 'default';
      
      // Process the result and extract just the generated diagnosis
      const generatedText = Array.isArray(result) 
        ? result[0]?.generated_text || '' 
        : result.generated_text || '';
      
      // Extract only the diagnosis part (after the prompt)
      const diagnosisText = generatedText.substring(prompt.length).trim();
      return diagnosisText;
    } catch (error: unknown) {
      document.body.style.cursor = 'default';
      console.error('Error generating diagnosis:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Feil ved generering av diagnose: ${errorMessage}`;
    }
  }

  /**
   * Check if the model is currently loaded
   */
  public isModelLoaded(): boolean {
    return this.textGenerationPipeline !== null && this.pipelineInitialized;
  }

  /**
   * Change the model configuration
   * @param config New model configuration
   */
  public async changeModel(config: Partial<ModelConfig>): Promise<void> {
    // Reset the pipeline so it will be reinitialized with new config
    this.textGenerationPipeline = null;
    this.pipelineInitialized = false;
    await this.initialize(config);
  }
}

export default LLMService; 