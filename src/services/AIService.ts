import { InferenceClient } from '@huggingface/inference';

// Configuration types
export interface AIServiceConfig {
  apiKey: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  task?: 'text-generation' | 'conversational';
}

/**
 * Service for interacting with external AI models via APIs
 */
export class AIService {
  private static instance: AIService;
  private hf: InferenceClient | null = null;
  private config: AIServiceConfig = {
    apiKey: '', // Will be set by initialize
    modelId: 'mistralai/Mistral-7B-Instruct-v0.2', // Default model
    temperature: 0.7,
    maxTokens: 500,
    task: 'text-generation' // Default task
  };

  private constructor() {}

  /**
   * Get the singleton instance of AIService
   */
  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Initialize the service with API key and configuration
   * @param config Configuration options including API key
   */
  public initialize(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (!this.config.apiKey) {
      console.warn('No API key provided to AIService. API calls will fail.');
      return;
    }
    this.hf = new InferenceClient(this.config.apiKey);
  }

  /**
   * Detect the appropriate task for a model based on model ID
   * This is a simple heuristic and may need to be updated as more models are added
   */
  private detectModelTask(modelId: string): 'text-generation' | 'conversational' {
    // Models known to be conversational
    const conversationalModels = [
      'chat', 'Chat',
      'instruct', 'Instruct',
      'conversation', 'Conversation',
      'dialogue', 'Dialogue'
    ];
    
    // Check if the model ID contains any conversational indicators
    for (const indicator of conversationalModels) {
      if (modelId.includes(indicator)) {
        return 'conversational';
      }
    }
    
    // Default to text-generation
    return 'text-generation';
  }

  /**
   * Generate a diagnosis based on makroskopisk and mikroskopisk descriptions
   * @param makroText The makroskopisk beskrivelse text
   * @param mikroText The mikroskopisk beskrivelse text
   * @returns Promise with the generated diagnosis text
   */
  public async generateDiagnosis(makroText: string, mikroText: string): Promise<string> {
    if (!this.hf) {
      throw new Error('AIService not initialized with API key');
    }

    // Create a detailed prompt with specific formatting instructions based on examples
    const prompt = `Du er en erfaren patolog som skal formulere en presis diagnose/konklusjon på norsk basert på makroskopiske og mikroskopiske beskrivelser.

VIKTIG INSTRUKS: Analyser nøye de faktiske funnene i den mikroskopiske og makroskopiske beskrivelsen nedenfor. Ikke gjenta eksempelet under, men lag en ny diagnose basert på de reelle funnene i denne spesifikke prøven.

Konklusjonen skal:
- Være kort og konsis med fokus på diagnosene
- Nøyaktig reflektere funnene som er beskrevet i teksten under
- Gruppere prøver med like funn (nummererte prøver med samme diagnose)
- Spesifisere vevtype, dysplasigrad, og lokalisasjon for hver gruppe av prøver viss det er relevant

Format for diagnosen:
- Start med prøvenumrene fulgt av kolon, deretter diagnosen (f.eks. "1: Tubulært adenom...")
- Angi korrekt antall lesjoner og lokalisasjon
- Inkluder kun funn som faktisk er beskrevet i prøven - IKKE bruk eksemplet som mal

MERK: Formatet under er kun et eksempel på struktur. Diagnosene du gir MÅ være basert på de faktiske funnene i den aktuelle prøven.

Eksempel på format (IKKE KOPIER DISSE DIAGNOSENE):
"1-4 og 6: Tubulære adenomer med lavgradig dysplasi, 5 stk., colon slyngereseksjon.
5 : Lett polypoid tykktarmslimhinne med lette reaktive forandringer. Dysplasi ikke påvist.
7: Lett polypoid tykktarmslimhinne med lette reaktive forandringer. Dysplasi påvist.
8: Hyperplastisk polypp, colon slyngereseksjon.
9: Hyperplastisk polypp, rectum slyngereseksjon."

MAKROSKOPISK BESKRIVELSE:
${makroText || 'Ingen makroskopisk beskrivelse tilgjengelig.'}

MIKROSKOPISK BESKRIVELSE:
${mikroText || 'Ingen mikroskopisk beskrivelse tilgjengelig.'}

KONKLUSJON/DIAGNOSE (basert UTELUKKENDE på de faktiske funnene i prøven ovenfor):
`;

    try {
      console.log(`Generating diagnosis with model: ${this.config.modelId}`);
      
      // Determine the appropriate task for this model if not explicitly set
      const task = this.config.task || this.detectModelTask(this.config.modelId);
      console.log(`Using task: ${task} for model: ${this.config.modelId}`);
      
      let generatedText = '';
      
      if (task === 'text-generation') {
        // Call the Hugging Face text generation API
        const response = await this.hf.textGeneration({
          model: this.config.modelId,
          inputs: prompt,
          parameters: {
            temperature: this.config.temperature,
            max_new_tokens: this.config.maxTokens,
            return_full_text: true
          }
        });
        
        generatedText = response.generated_text.trim();
      } else if (task === 'conversational') {
        // Call the Hugging Face chat completion API for conversational models
        const response = await this.hf.chatCompletion({
          model: this.config.modelId,
          messages: [
            { role: 'system', content: 'Du er en erfaren patolog som skal formulere presise, korte diagnoser basert på patologiske undersøkelser. VIKTIG: Analyser nøye de faktiske funnene i mikroskopisk og makroskopisk beskrivelse som blir presentert for deg. Ikke gjenta eksempler, men formuler diagnoser som nøyaktig reflekterer de spesifikke funnene i hver prøve. Gruppér prøver med lignende funn, men kun basert på det som faktisk er beskrevet i materialet.' },
            { role: 'user', content: prompt }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens
        });
        
        generatedText = response.choices[0]?.message?.content || '';
      }

      // Return the generated text
      return generatedText;
      
    } catch (error) {
      console.error('Error generating diagnosis:', error);
      
      // Return a user-friendly error message
      if (error instanceof Error) {
        console.log('Error message:', error.message);
        
        if (error.message.includes('401')) {
          return 'Feil: API-nøkkel mangler eller er ugyldig. Vennligst sjekk innstillingene. (401 Unauthorized)';
        } else if (error.message.includes('429')) {
          return 'Feil: For mange forespørsler til AI-tjenesten. Vennligst prøv igjen senere. (429 Too Many Requests)';
        } else if (error.message.includes('503')) {
          return 'Feil: AI-tjenesten er midlertidig utilgjengelig. Vennligst prøv igjen senere. (503 Service Unavailable)';
        } else if (error.message.includes('404')) {
          return `Feil: Modellen "${this.config.modelId}" ble ikke funnet. Vennligst velg en annen modell. (404 Not Found)`;
        } else if (error.message.includes('403')) {
          return 'Feil: Ingen tilgang til modellen. Vennligst sjekk at API-nøkkelen har riktige tilganger. (403 Forbidden)';
        } else if (error.message.includes('not supported for task')) {
          // Try the other task if the current one fails
          try {
            // Toggle the task
            const newTask = this.config.task === 'text-generation' ? 'conversational' : 'text-generation';
            console.log(`Switching to task: ${newTask} for model: ${this.config.modelId}`);
            
            // Update the config temporarily
            const originalTask = this.config.task;
            this.config.task = newTask;
            
            // Try again with the new task
            const result = await this.generateDiagnosis(makroText, mikroText);
            
            // Restore the original task
            this.config.task = originalTask;
            
            return result;
          } catch (retryError) {
            console.error('Error after task switch:', retryError);
            return `Feil: Modellen "${this.config.modelId}" støtter ikke oppgaven. Vennligst velg en annen modell eller oppgavetype.`;
          }
        }
        
        return `Feil: ${error.message}`;
      }
      
      return 'Feil ved generering av diagnose. Vennligst prøv igjen senere.';
    }
  }
  
  /**
   * Check if the service is properly initialized
   */
  public isInitialized(): boolean {
    return this.hf !== null;
  }
  
  /**
   * Update the configuration
   */
  public updateConfig(config: Partial<AIServiceConfig>): void {
    this.initialize(config);
  }
}

export default AIService; 