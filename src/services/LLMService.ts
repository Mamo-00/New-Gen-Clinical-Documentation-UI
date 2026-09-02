import { pipeline } from '@huggingface/transformers';

type Device = 'cpu' | 'webgpu';
type Dtype = 'fp32' | 'fp16' | 'q8' | 'q4';

interface ModelConfig {
  model: string;
  temperature?: number;
  max_length?: number;
  device?: Device;
  dtype?: Dtype;
}

interface GenerateOptions {
  maxLength?: number;
  temperature?: number;
  topK?: number;
  topP?: number;
}

type TextGenerationPipeline = (
  text: string,
  options?: Record<string, unknown>
) => Promise<Array<{ generated_text: string }> | { generated_text: string }>;

type PipelineWithDispose = TextGenerationPipeline & { dispose?: () => Promise<void> | void };

const DEFAULT_MODEL = 'HuggingFaceTB/SmolLM2-1.7B-Instruct:q4f16';

export class LLMService {
  private static instance: LLMService;
  private textGenerationPipeline: PipelineWithDispose | null = null;
  private loadingPromise: Promise<PipelineWithDispose> | null = null;
  private pipelineInitialized: boolean = false;
  private config: Required<Pick<ModelConfig, 'model' | 'temperature' | 'max_length' | 'device' | 'dtype'>> = {
    model: DEFAULT_MODEL,
    temperature: 0.8,
    max_length: 2048,
    device: 'webgpu',
    dtype: 'fp32',
  };

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  public async initialize(config?: Partial<ModelConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config } as Required<Pick<ModelConfig, 'model' | 'temperature' | 'max_length' | 'device' | 'dtype'>>;
    }

    console.log('Initializing local model:', this.config.model);

    if (this.pipelineInitialized && this.textGenerationPipeline) {
      await this.disposePipeline();
    }

    if (this.loadingPromise) {
      try {
        this.textGenerationPipeline = await this.loadingPromise;
        this.pipelineInitialized = true;
      } catch (error) {
        console.error('Failed to load LLM model:', error);
        throw error;
      } finally {
        this.loadingPromise = null;
      }
      return;
    }

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

  private async detectBestDevice(): Promise<{ device: Device; dtype: Dtype }> {
    const hasWebGPU =
      typeof navigator !== 'undefined' &&
      'gpu' in navigator &&
      typeof (navigator as Navigator & { gpu?: unknown }).gpu !== 'undefined';

    if (hasWebGPU) {
      console.log('[LLMService] WebGPU detected; using webgpu + fp16');
      return { device: 'webgpu', dtype: 'fp16' };
    }
    console.log('[LLMService] WebGPU unavailable; falling back to cpu + q4');
    return { device: 'cpu', dtype: 'q4' };
  }

  private showNotification(message: string, isError: boolean = false): void {
    try {
      const notificationId = isError ? 'model-error-notification' : 'model-loading-notification';
      let notification = document.getElementById(notificationId);

      if (!notification) {
        notification = document.createElement('div');
        notification.id = notificationId;
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '15px';
        notification.style.backgroundColor = isError ? '#F44336' : '#2196F3';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '9999';
        notification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        document.body.appendChild(notification);
      }

      notification.textContent = message;

      const existingTimeout = (notification as HTMLDivElement & { _timeoutId?: number })._timeoutId;
      if (existingTimeout) {
        window.clearTimeout(existingTimeout);
      }

      if (!isError) {
        (notification as HTMLDivElement & { _timeoutId?: number })._timeoutId = window.setTimeout(() => {
          notification?.remove();
        }, 5000);
      } else {
        (notification as HTMLDivElement & { _timeoutId?: number })._timeoutId = window.setTimeout(() => {
          notification?.remove();
        }, 8000);
      }
    } catch (domError) {
      console.warn('[LLMService] Could not render notification:', domError);
    }
  }

  private async initializePipeline(): Promise<PipelineWithDispose> {
    const originalDevice = this.config.device;
    const originalDtype = this.config.dtype;
    let resolvedDevice: Device = originalDevice;
    let resolvedDtype: Dtype = originalDtype;

    try {
      document.body.style.cursor = 'wait';
      this.showNotification(`Laster modell: ${this.config.model}…`);

      const { device: detectedDevice, dtype: detectedDtype } = await this.detectBestDevice();
      resolvedDevice = originalDevice === 'webgpu' && detectedDevice !== 'webgpu' ? detectedDevice : originalDevice;
      resolvedDtype = originalDtype;

      if (resolvedDevice === 'webgpu' && resolvedDtype === 'fp32') {
        resolvedDtype = 'fp16';
      }
      if (resolvedDevice === 'cpu' && (resolvedDtype === 'fp32' || resolvedDtype === 'fp16')) {
        resolvedDtype = 'q4';
      }

      console.log(`[LLMService] Creating pipeline with device=${resolvedDevice}, dtype=${resolvedDtype}`);

      const pipe = (await pipeline('text-generation', this.config.model, {
        device: resolvedDevice,
        dtype: resolvedDtype,
      } as Record<string, unknown>)) as PipelineWithDispose;

      this.showNotification(`Modell lastet: ${this.config.model}`, false);
      document.body.style.cursor = 'default';
      return pipe;
    } catch (error: unknown) {
      document.body.style.cursor = 'default';
      console.error('Error initializing pipeline:', error);

      if (resolvedDevice === 'webgpu' && originalDevice !== 'cpu') {
        console.warn('[LLMService] WebGPU failed; retrying on CPU…');
        this.config.device = 'cpu';
        this.config.dtype = 'q4';
        try {
          const cpuPipe = await this.initializePipeline();
          this.config.device = originalDevice;
          this.config.dtype = originalDtype;
          return cpuPipe;
        } catch (cpuError) {
          this.config.device = originalDevice;
          this.config.dtype = originalDtype;
          const errorMessage = cpuError instanceof Error ? cpuError.message : String(cpuError);
          this.showNotification(`Feil ved lasting av modell (CPU-fallback): ${errorMessage}`, true);
          throw cpuError;
        }
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.showNotification(`Feil ved lasting av modell: ${errorMessage}`, true);
      throw error;
    }
  }

  private async disposePipeline(): Promise<void> {
    if (this.textGenerationPipeline && typeof this.textGenerationPipeline.dispose === 'function') {
      try {
        await this.textGenerationPipeline.dispose();
        console.log('[LLMService] Previous pipeline disposed.');
      } catch (e) {
        console.warn('[LLMService] Dispose failed:', e);
      }
    }
    this.textGenerationPipeline = null;
    this.pipelineInitialized = false;
  }

  private extractDiagnosis(generatedText: string, prompt: string): string {
    if (generatedText.startsWith(prompt)) {
      return generatedText.substring(prompt.length).trim();
    }

    const delimiters = [
      'Konklusjon/Diagnose:',
      'Konklusjon / Diagnose:',
      'KONKLUSJON/DIAGNOSE:',
      'Diagnose:',
      'Konklusjon:',
    ];

    for (const delim of delimiters) {
      const idx = generatedText.lastIndexOf(delim);
      if (idx !== -1) {
        return generatedText.substring(idx + delim.length).trim();
      }
    }

    return generatedText.trim();
  }

  public async generateDiagnosis(
    makroText: string,
    mikroText: string,
    options?: GenerateOptions,
  ): Promise<string> {
    if (!this.textGenerationPipeline) {
      try {
        await this.initialize();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return 'Feil: Kunne ikke laste modellen. ' + errorMessage;
      }
    }

    if (!this.textGenerationPipeline) {
      return 'Feil: Lokal modell kunne ikke initialiseres. Prov a velge en annen modell eller bruk HuggingFace API.';
    }

    const prompt = this.buildDiagnosisPrompt(makroText, mikroText);

    try {
      document.body.style.cursor = 'wait';

      const raw = await this.textGenerationPipeline(prompt, {
        max_new_tokens: options?.maxLength ?? this.config.max_length,
        temperature: options?.temperature ?? this.config.temperature,
        top_k: options?.topK ?? 50,
        top_p: options?.topP ?? 0.9,
        do_sample: true,
      });

      document.body.style.cursor = 'default';

      const generatedText = Array.isArray(raw)
        ? raw[0]?.generated_text ?? ''
        : raw.generated_text ?? '';

      return this.extractDiagnosis(generatedText, prompt);
    } catch (error: unknown) {
      document.body.style.cursor = 'default';
      console.error('Error generating diagnosis:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return 'Feil ved generering av diagnose: ' + errorMessage;
    }
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
      '- Inkluder kun funn som faktisk er beskrevet i proven\n' +
      '\n' +
      'Makroskopisk beskrivelse:\n' +
      (makroText || 'Ingen makroskopisk beskrivelse tilgjengelig.') + '\n' +
      '\n' +
      'Mikroskopisk beskrivelse:\n' +
      (mikroText || 'Ingen mikroskopisk beskrivelse tilgjengelig.') + '\n' +
      '\n' +
      'Konklusjon/Diagnose:'
    );
  }

  public isModelLoaded(): boolean {
    return this.textGenerationPipeline !== null && this.pipelineInitialized;
  }

  public async changeModel(config: Partial<ModelConfig>): Promise<void> {
    await this.disposePipeline();
    await this.initialize(config);
  }
}

export default LLMService;
