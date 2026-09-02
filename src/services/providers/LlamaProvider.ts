import { AIProviderConfig, BaseAIProvider, TextGenerationOptions, handleProviderError, diagnosedFetch } from './BaseAIProvider';

type GroqChatPayload = {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string[] | string;
};

type GroqChatChoice = {
  message?: {
    role?: string;
    content?: string;
  };
  finish_reason?: string;
};

type GroqChatResponse = {
  id?: string;
  choices?: GroqChatChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    prompt_time?: number;
    completion_time?: number;
    total_time?: number;
  };
  error?: { message?: string; type?: string };
};

/**
 * Provider that calls the Groq REST API (https://api.groq.com/openai/v1).
 *
 * Groq hosts Llama-family models (Meta Llama 3.x / Llama 4), plus Mixtral,
 * Gemma 2, DeepSeek-R1 distill, and others, on their ultra-fast LPU chip.
 *
 * The name "LlamaProvider" is kept for backward compatibility with any
 * localStorage key that might already use `AIProviderType.LLAMA`; the user
 * should treat it as the "Groq (Llama + others)" provider in the UI.
 *
 * Get a free (rate-limited) API key: https://console.groq.com/keys
 * Endpoint reference: https://console.groq.com/docs/api-reference#chat
 */
export class LlamaProvider implements BaseAIProvider {
  private static instance: LlamaProvider;

  private apiKey: string = '';
  private modelId: string = 'llama-3.3-70b-versatile';
  private config: AIProviderConfig = {
    apiKey: '',
    modelId: 'llama-3.3-70b-versatile',
    temperature: 0.6,
    maxTokens: 4096,
    endpoint: 'https://api.groq.com/openai/v1',
  };
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): LlamaProvider {
    if (!LlamaProvider.instance) {
      LlamaProvider.instance = new LlamaProvider();
    }
    return LlamaProvider.instance;
  }

  public initialize(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
    this.apiKey = this.config.apiKey || '';
    this.modelId = this.config.modelId || 'llama-3.3-70b-versatile';
    if (!this.apiKey) {
      console.warn('[LlamaProvider (Groq)] No API key provided. API calls will fail. ' +
        'Get a free key at https://console.groq.com/keys and paste it into AI-innstillinger → Direkte-Provider → Llama/Groq.');
      this.initialized = false;
      return;
    }
    this.initialized = true;
  }

  public async generateText(prompt: string, options?: TextGenerationOptions): Promise<string> {
    if (!this.initialized || !this.apiKey) {
      throw new Error('LlamaProvider (Groq) not initialized with API key');
    }

    try {
      const endpoint = (this.config.endpoint || 'https://api.groq.com/openai/v1') + '/chat/completions';

      const payload: GroqChatPayload = {
        model: this.modelId,
        messages: [
          { role: 'system', content: 'Du er en erfarin patolog som skriver presise, konsise diagnoser/konklusjoner på norsk.' },
          { role: 'user', content: prompt },
        ],
        temperature: typeof options?.temperature === 'number'
          ? options.temperature
          : (this.config.temperature ?? 0.7),
        max_tokens: typeof options?.maxTokens === 'number'
          ? options.maxTokens
          : (this.config.maxTokens ?? 1000),
        top_p: options?.topP ?? 1.0,
        stop: options?.stopSequences,
        stream: options?.streamResponse ?? false,
      };
      const bodyStr = JSON.stringify(payload);

      const { response, data } = await diagnosedFetch<GroqChatResponse>({
        label: 'chat/completions',
        providerName: 'Groq',
        modelId: this.modelId,
        endpoint,
        method: 'POST',
        timeoutMs: options?.timeoutMs ?? 60000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + this.apiKey,
          'Groq-Client': 'clinical-doc-ui/1.0',
        },
        body: bodyStr,
        bodySizeBytes: new Blob([bodyStr]).size,
      });

      if (!response.ok) {
        const errMsg =
          (data && data.error && (data.error.message || JSON.stringify(data.error))) ||
          ('HTTP error ' + response.status);
        throw new Error('HTTP error ' + response.status + ': ' + errMsg);
      }

      const choices = data && Array.isArray(data.choices) ? data.choices : [];
      if (choices.length === 0) {
        throw new Error('Groq returned empty choices[] array (no content)');
      }

      // Concatenate all choices[].message.content (typically just one choice)
      const contents: string[] = [];
      for (const ch of choices) {
        const c = ch && ch.message && typeof ch.message.content === 'string' ? ch.message.content : '';
        if (c) contents.push(c);
      }
      const result = contents.join('\n').trim();

      // Optional: log Groq-specific usage timings (LPU tokens/sec are interesting)
      if (data && data.usage) {
        const u = data.usage;
        // eslint-disable-next-line no-console
        console.debug(
          '[Groq usage] tokens:', u.prompt_tokens || 0, '→', u.completion_tokens || 0,
          '| time(s):',
          'prompt=' + (typeof u.prompt_time === 'number' ? u.prompt_time.toFixed(3) : '?'),
          'comp=' + (typeof u.completion_time === 'number' ? u.completion_time.toFixed(3) : '?'),
          'total=' + (typeof u.total_time === 'number' ? u.total_time.toFixed(3) : '?'),
        );
      }

      if (!result) {
        throw new Error('Groq response had no text content (empty content)');
      }
      return result;
    } catch (error) {
      return handleProviderError(error, 'Groq');
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public static getModelOptions() {
    return [
      // --- Llama-family (Meta) on Groq LPU ---
      { id: 'llama-4-maverick-128e',       name: 'Llama 4 Maverick 128E (flaggskip)',  category: 'Groq · Llama' },
      { id: 'llama-3.3-70b-versatile',     name: 'Llama 3.3 70B Versatile (anbefalt)', category: 'Groq · Llama' },
      { id: 'llama-3.3-70b-specdec',       name: 'Llama 3.3 70B SpecDec (ekstrem rask)', category: 'Groq · Llama' },
      { id: 'llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B (lavkostnad, rask)', category: 'Groq · Llama' },
      { id: 'llama-3.1-8b-instant',        name: 'Llama 3.1 8B Instant (raskest, liten)', category: 'Groq · Llama' },

      // --- Other popular models hosted by Groq ---
      { id: 'mixtral-8x7b-32768',          name: 'Mixtral 8x7B (32k kontekst)',      category: 'Groq · Mistral' },
      { id: 'gemma2-9b-it',                name: 'Gemma 2 9B IT',                    category: 'Groq · Google' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Distill Llama 70B (resonnement)', category: 'Groq · DeepSeek' },
      { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen 2.5 Coder 32B Instruct',   category: 'Groq · Alibaba' },
    ];
  }
}
