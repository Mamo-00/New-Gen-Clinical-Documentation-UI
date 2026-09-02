export interface AIServiceConfig {
  apiKey: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  task?: 'text-generation' | 'conversational';
}

interface TextGenerationPayload {
  inputs: string;
  parameters: {
    temperature: number;
    max_new_tokens: number;
    return_full_text: boolean;
    top_p: number;
    top_k: number;
    do_sample: boolean;
  };
}

interface ChatCompletionPayload {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
}

interface TextGenerationResponse {
  generated_text: string;
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string } }>;
}

interface ErrorPayload {
  error?: string;
}

const INFERENCE_ENDPOINT = 'https://router.huggingface.co/hf-inference';

export class AIService {
  private static instance: AIService;
  private config: AIServiceConfig = {
    apiKey: '',
    modelId: 'mistralai/Mistral-7B-Instruct-v0.2',
    temperature: 0.7,
    maxTokens: 500,
    task: 'text-generation',
  };

  private constructor() {}

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  public initialize(config: Partial<AIServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (!this.config.apiKey) {
      console.warn('No API key provided to AIService. API calls will fail.');
    }
  }

  private detectModelTask(modelId: string): 'text-generation' | 'conversational' {
    const conversationalModels = [
      'chat', 'Chat',
      'instruct', 'Instruct',
      'conversation', 'Conversation',
      'dialogue', 'Dialogue',
    ];

    for (const indicator of conversationalModels) {
      if (modelId.indexOf(indicator) !== -1) {
        return 'conversational';
      }
    }

    return 'text-generation';
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + this.config.apiKey,
    };
  }

  private async requestTextGeneration(prompt: string): Promise<string> {
    const payload: TextGenerationPayload = {
      inputs: prompt,
      parameters: {
        temperature: this.config.temperature ?? 0.7,
        max_new_tokens: this.config.maxTokens ?? 500,
        return_full_text: true,
        top_p: 0.95,
        top_k: 50,
        do_sample: true,
      },
    };

    const url = INFERENCE_ENDPOINT + '/models/' + encodeURIComponent(this.config.modelId);
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error('HTTP ' + res.status + ': ' + errorText);
    }

    const data = (await res.json()) as TextGenerationResponse | TextGenerationResponse[];
    const text = Array.isArray(data) ? data[0]?.generated_text : data.generated_text;
    return (text ?? '').trim();
  }

  private async requestChatCompletion(prompt: string): Promise<string> {
    const systemContent =
      'Du er en erfaren patolog som skal formulere presise, korte diagnoser basert pa patologiske undersokelser. ' +
      'VIKTIG: Analyser noye de faktiske funnene i mikroskopisk og makroskopisk beskrivelse som blir presentert for deg. ' +
      'Ikke gjenta eksempler, men formuler diagnoser som noyaktig reflekterer de spesifikke funnene i hver prove. ' +
      'Grupper prover med lignende funn, men kun basert pa det som faktisk er beskrevet i materialet.';

    const payload: ChatCompletionPayload = {
      model: this.config.modelId,
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt },
      ],
      temperature: this.config.temperature ?? 0.7,
      max_tokens: this.config.maxTokens ?? 500,
    };

    const url = INFERENCE_ENDPOINT + '/v1/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error('HTTP ' + res.status + ': ' + errorText);
    }

    const data = (await res.json()) as ChatCompletionResponse;
    return data.choices?.[0]?.message?.content ?? '';
  }

  private buildDiagnosisPrompt(makroText: string, mikroText: string): string {
    return (
      'Du er en erfaren patolog som skal formulere en presis diagnose/konklusjon pa norsk basert pa makroskopiske og mikroskopiske beskrivelser.\n' +
      '\n' +
      'VIKTIG INSTRUKS: Analyser noye de faktiske funnene i den mikroskopiske og makroskopiske beskrivelsen nedenfor. Ikke gjenta eksempelet under, men lag en ny diagnose basert pa de reelle funnene i denne spesifikke proven.\n' +
      '\n' +
      'Konklusjonen skal:\n' +
      '- Vare kort og konsis med fokus pa diagnosene\n' +
      '- Noyaktig reflektere funnene som er beskrevet i teksten under\n' +
      '- Gruppere prover med like funn (nummererte prover med samme diagnose)\n' +
      '- Spesifisere vevtype, dysplasigrad, og lokalisasjon for hver gruppe av prover viss det er relevant\n' +
      '\n' +
      'Format for diagnosen:\n' +
      '- Start med provenumrene fulgt av kolon, deretter diagnosen (f.eks. "1: Tubulaert adenom...")\n' +
      '- Angi korrekt antall lesjoner og lokalisasjon\n' +
      '- Inkluder kun funn som faktisk er beskrevet i proven - IKKE bruk eksemplet som mal\n' +
      '\n' +
      'MERK: Formatet under er kun et eksempel pa struktur. Diagnosene du gir MA være basert pa de faktiske funnene i den aktuelle proven.\n' +
      '\n' +
      'Eksempel pa format (IKKE KOPIER DISSE DIAGNOSENE):\n' +
      '"1-4 og 6: Tubulare adenomer med lavgradig dysplasi, 5 stk., colon slyngereseksjon.\n' +
      '5 : Lett polypoid tykktarmslimhinne med lette reaktive forandringer. Dysplasi ikke pavist.\n' +
      '7: Lett polypoid tykktarmslimhinne med lette reaktive forandringer. Dysplasi pavist.\n' +
      '8: Hyperplastisk polypp, colon slyngereseksjon.\n' +
      '9: Hyperplastisk polypp, rectum slyngereseksjon."\n' +
      '\n' +
      'MAKROSKOPISK BESKRIVELSE:\n' +
      (makroText || 'Ingen makroskopisk beskrivelse tilgjengelig.') + '\n' +
      '\n' +
      'MIKROSKOPISK BESKRIVELSE:\n' +
      (mikroText || 'Ingen mikroskopisk beskrivelse tilgjengelig.') + '\n' +
      '\n' +
      'KONKLUSJON/DIAGNOSE (basert UTELUKKENDE pa de faktiske funnene i proven ovenfor):'
    );
  }

  public async generateDiagnosis(makroText: string, mikroText: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('AIService not initialized with API key');
    }

    const prompt = this.buildDiagnosisPrompt(makroText, mikroText);

    try {
      const task = this.config.task ?? this.detectModelTask(this.config.modelId);
      console.log('[AIService] Generating diagnosis with model: ' + this.config.modelId + ' (task=' + task + ')');

      try {
        if (task === 'conversational') {
          return await this.requestChatCompletion(prompt);
        }
        return await this.requestTextGeneration(prompt);
      } catch (primaryError) {
        const message = primaryError instanceof Error ? primaryError.message : String(primaryError);
        const requiresFallback: boolean =
          message.indexOf('not supported for task') !== -1 ||
          message.indexOf('400') !== -1 ||
          message.indexOf('not found') !== -1 ||
          message.indexOf('404') !== -1;

        if (!requiresFallback) {
          throw primaryError;
        }

        const fallbackTask: 'text-generation' | 'conversational' =
          task === 'conversational' ? 'text-generation' : 'conversational';
        console.warn('[AIService] Primary task "' + task + '" failed; retrying as "' + fallbackTask + '". Reason: ' + message);
        if (fallbackTask === 'conversational') {
          return await this.requestChatCompletion(prompt);
        }
        return await this.requestTextGeneration(prompt);
      }
    } catch (error) {
      console.error('[AIService] Error generating diagnosis:', error);

      if (error instanceof Error) {
        const message = error.message;

        if (message.indexOf('401') !== -1 || message.toLowerCase().indexOf('unauthorized') !== -1) {
          return 'Feil: API-nokkel mangler eller er ugyldig. Vennligst sjekk innstillingene. (401 Unauthorized)';
        }
        if (message.indexOf('429') !== -1 || message.indexOf('rate limit') !== -1 || message.indexOf('quota') !== -1) {
          return 'Feil: For mange foresporsler til AI-tjenesten. Vennligst prov igjen senere. (429 Too Many Requests)';
        }
        if (message.indexOf('503') !== -1 || message.indexOf('Service Unavailable') !== -1) {
          return 'Feil: AI-tjenesten er midlertidig utilgjengelig. Vennligst prov igjen senere. (503 Service Unavailable)';
        }
        if (message.indexOf('404') !== -1 || message.indexOf('Not Found') !== -1) {
          return 'Feil: Modellen "' + this.config.modelId + '" ble ikke funnet. Vennligst velg en annen modell. (404 Not Found)';
        }
        if (message.indexOf('403') !== -1 || message.indexOf('Forbidden') !== -1) {
          return 'Feil: Ingen tilgang til modellen. Vennligst sjekk at API-nokkelen har riktige tilganger. (403 Forbidden)';
        }
        if (message.indexOf('CORS') !== -1 || message.indexOf('cors') !== -1) {
          return 'Feil: CORS-problemer med AI-API-et. Prov a aktivere CORS-proxy i innstillingene.';
        }

        try {
          const parsed = JSON.parse(message) as ErrorPayload;
          if (parsed && parsed.error) {
            return 'Feil: ' + parsed.error;
          }
        } catch {
          // JSON parsing failure is fine; fall through to generic message
        }

        return 'Feil: ' + message;
      }

      return 'Feil ved generering av diagnose. Vennligst prov igjen senere.';
    }
  }

  public isInitialized(): boolean {
    return this.config.apiKey.length > 0;
  }

  public updateConfig(config: Partial<AIServiceConfig>): void {
    this.initialize(config);
  }
}

export default AIService;
