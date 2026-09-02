import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError, diagnosedFetch } from './BaseAIProvider';

/**
 * Service for interfacing with Google's Gemini API for text generation
 */
export class GeminiProvider implements BaseAIProvider {
  private static instance: GeminiProvider;
  private apiKey: string = '';
  private modelId: string = 'gemini-3.7-flash';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'gemini-3.7-flash',
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
    this.modelId = this.config.modelId || 'gemini-3.7-flash';
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
      const payload: Record<string, unknown> = {
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
      const bodyStr = JSON.stringify(payload);

      // Construct the API endpoint URL (no ?key= query; auth via x-goog-api-key header)
      const endpoint = this.config.endpoint + '/models/' + mappedModelId + ':generateContent';

      const { response, data } = await diagnosedFetch<Record<string, unknown>>({
        label: 'generateContent',
        providerName: 'Gemini',
        modelId: mappedModelId,
        endpoint,
        method: 'POST',
        timeoutMs: options?.timeoutMs ?? 60000,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
          'x-goog-api-client': 'clinical-doc-ui/1.0',
        },
        body: bodyStr,
        bodySizeBytes: new Blob([bodyStr]).size,
      });

      if (!response.ok) {
        const d = data as Record<string, any>;
        const errMsg =
          (d && d.error && (d.error.message || JSON.stringify(d.error))) ||
          ('HTTP error ' + response.status);
        throw new Error('HTTP error ' + response.status + ': ' + errMsg);
      }

      const d = data as Record<string, any>;

      // Extract text from the Gemini API response (supports multiple parts/candidates)
      if (d.candidates && Array.isArray(d.candidates) && d.candidates.length > 0) {
        const first = d.candidates[0] as Record<string, any>;
        if (first.content && Array.isArray(first.content.parts) && first.content.parts.length > 0) {
          const parts = first.content.parts as Array<Record<string, any>>;
          return parts
            .map((p) => (typeof p.text === 'string' ? p.text : ''))
            .join('')
            .trim();
        }
        if (typeof first.text === 'string') {
          return first.text.trim();
        }
      }

      // Fallback: some error responses (blocked, etc.) still have promptsFeedback
      if (d.promptFeedback && d.promptFeedback.blockReason) {
        throw new Error('Gemini request blocked. reason=' + d.promptFeedback.blockReason +
          (d.promptFeedback.safetyRatings ? ' safety=' + JSON.stringify(d.promptFeedback.safetyRatings) : ''));
      }
      throw new Error('Unexpected response format from Gemini API');
    } catch (error) {
      const userMsg = handleProviderError(error, 'Gemini');
      // Do NOT throw: keep the legacy behavior of returning "Feil: ..." string so
      // MainPage diagnosis.startsWith('Feil:') check catches it.
      return userMsg;
    }
  }

  /**
   * Maps the friendly model ID to the actual API model name.
   * Includes backward-compatible aliases for deprecated/shut-down models
   * so existing user configs in localStorage still work after upgrading.
   */
  private mapModelIdToApiModel(modelId: string): string {
    const modelMap: {[key: string]: string} = {
      // Current stable / GA models (as of Sept 2026)
      'gemini-3.7-flash': 'gemini-3.7-flash',
      'gemini-3.6-flash': 'gemini-3.6-flash',
      'gemini-3.5-flash': 'gemini-3.5-flash',
      'gemini-3.5-flash-lite': 'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite': 'gemini-3.1-flash-lite',

      // Preview / flagships
      'gemini-3.1-pro-preview': 'gemini-3.1-pro-preview',
      'gemini-3-flash-preview': 'gemini-3-flash-preview',

      // Legacy but still-supported 2.5 family
      'gemini-2.5-flash': 'gemini-2.5-flash',
      'gemini-2.5-pro': 'gemini-2.5-pro',
      'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',

      // --- Deprecated / shut-down aliases (forward to nearest current model) ---
      // Old 2.5 Flash preview -> stable 2.5 Flash
      'gemini-2.5-flash-preview-04-17': 'gemini-2.5-flash',
      // 2.0 family was shut down 2026-06-01 -> map to 2.5 Flash-Lite (same price tier)
      'gemini-2.0-flash': 'gemini-2.5-flash-lite',
      'gemini-2.0-flash-experimental': 'gemini-2.5-flash-lite',
      'gemini-2.0-flash-lite': 'gemini-2.5-flash-lite',
      // Gemini 1.5 Flash -> legacy 2.5 Flash
      'gemini-1.5-flash': 'gemini-2.5-flash',
      // Gemma 3 is not served via the public Gemini REST API -> fall back to 3.5 Flash-Lite
      'gemma-3': 'gemini-3.5-flash-lite'
    };

    const mapped = modelMap[modelId];
    if (mapped && mapped !== modelId) {
      console.warn(`[GeminiProvider] Model "${modelId}" is deprecated; transparently using "${mapped}" instead.`);
    }
    return mapped || modelId;
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
      { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash (nyeste, anbefalt)', category: 'Google' },
      { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', category: 'Google' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', category: 'Google' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview (flaggskip)', category: 'Google' },
      { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (lavkostnad)', category: 'Google' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite (budsjett)', category: 'Google' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (eldre stabil)', category: 'Google' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (eldre)', category: 'Google' }
    ];
  }
} 