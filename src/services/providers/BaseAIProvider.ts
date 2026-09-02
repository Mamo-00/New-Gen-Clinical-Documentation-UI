// Base interface for AI provider services
export interface AIProviderConfig {
  apiKey: string;
  modelId: string;
  temperature?: number;
  maxTokens?: number;
  endpoint?: string;
  organizationId?: string;
  task?: 'text-generation' | 'conversational';
  useProxy?: boolean;
}

export interface BaseAIProvider {
  initialize(config: Partial<AIProviderConfig>): Promise<void> | void;
  generateText(prompt: string, options?: any): Promise<string>;
  isInitialized(): boolean;
}

// Common configuration for text generation
export interface TextGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  streamResponse?: boolean;
  stopSequences?: string[];
  timeoutMs?: number;
}

// Helper function to proxy API requests to avoid CORS issues
export function getProxiedUrl(url: string): string {
  // Use a CORS proxy if needed - these are for development only!
  // For production, you should set up your own proxy server
  const corsProxies = [
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url='
  ];
  
  // Check if the feature flag is enabled in localStorage
  const useProxy = localStorage.getItem('use_cors_proxy') === 'true';
  if (!useProxy) return url;
  
  // Use the first proxy in the list
  return corsProxies[0] + encodeURIComponent(url);
}

// Utility function to create standard diagnosis prompts
export function createDiagnosisPrompt(makroText: string, mikroText: string): string {
  return (
    '\nDu er en erfaren patolog som skal formulere en presis diagnose/konklusjon pa norsk basert pa makroskopiske og mikroskopiske beskrivelser.\n' +
    '\n' +
    'VIKTIG INSTRUKS: Analyser noye de faktiske funnene i den mikroskopiske og makroskopiske beskrivelsen nedenfor. Lag en diagnose basert pa de reelle funnene i denne spesifikke proven. Viktigest av alt er at diagnosen er pa norsk.\n' +
    '\n' +
    'Konklusjonen skal:\n' +
    '- Vare kort og konsis med fokus pa diagnosene\n' +
    '- Noyaktig reflektere funnene som er beskrevet i teksten under\n' +
    '- Spesifisere vevtype, dysplasigrad, og lokalisasjon for hver gruppe av prover viss det er relevant\n' +
    '\n' +
    'Format for diagnosen:\n' +
    '- kun diagnoser, ingen forklaringer eller kommentarer eller innledninger\n' +
    '- Start med provenumrene fulgt av kolon, deretter diagnosen (f.eks. "1: Tubulaert adenom...")\n' +
    '- Angi korrekt antall lesjoner og lokalisasjon\n' +
    '- Inkluder kun funn som faktisk er beskrevet i proven\n' +
    '- diagnosen skal vere pa norsk\n' +
    '\n' +
    'MAKROSKOPISK BESKRIVELSE:\n' +
    (makroText || 'Ingen makroskopisk beskrivelse tilgjengelig.') + '\n' +
    '\n' +
    'MIKROSKOPISK BESKRIVELSE:\n' +
    (mikroText || 'Ingen mikroskopisk beskrivelse tilgjengelig.') + '\n'
  );
}

// Error handling utility for provider services
export function handleProviderError(error: unknown, providerName: string): string {
  console.error(providerName + ' API error:', error);
  
  if (error instanceof Error) {
    const name = error.name || '';
    const msg = error.message || '';
    if (name === 'AbortError' || msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')) {
      return 'Feil: Foresporselen til ' + providerName + ' tok for lang tid (>60s). Dersom dette sker hyppig, prov en raskere modell (f.eks. Groq eller Gemini Flash) eller lokal inferens.';
    }
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('authentication')) {
      return 'Feil: API-nokkel mangler eller er ugyldig for ' + providerName + '. Vennligst sjekk innstillingene.';
    } else if (msg.includes('429') || msg.includes('rate limit') || msg.includes('quota')) {
      return 'Feil: For mange foresporsler til ' + providerName + ', eller API-kreditter/grense er brukt opp. Vennligst prov igjen senere, eller bytt til en annen leverandor / lokal inferens.';
    } else if (msg.includes('503') || msg.includes('service unavailable')) {
      return 'Feil: ' + providerName + ' er midlertidig utilgjengelig. Vennligst prov igjen senere.';
    } else if (msg.includes('404') || msg.includes('not found')) {
      return 'Feil: Modellen ble ikke funnet pa ' + providerName + '. Vennligst velg en annen modell.';
    } else if (msg.includes('403') || msg.includes('forbidden') || msg.includes('permission denied')) {
      return 'Feil: Ingen tilgang til modellen pa ' + providerName + '. Vennligst sjekk at API-nokkelen har riktige tilganger, og at du har nok kreditter.';
    } else if (msg.includes('CORS') || msg.includes('cors')) {
      return 'Feil: CORS-problemer med ' + providerName + ' API. Prov a aktivere CORS-proxy i innstillingene eller bruk en backend-proxy.';
    }
    return 'Feil fra ' + providerName + ': ' + msg;
  }
  return 'Feil ved generering av diagnose via ' + providerName + '. Vennligst prov igjen senere.';
}

let __requestCounter = 0;

export interface DiagnosedFetchOptions extends RequestInit {
  timeoutMs?: number;
  label?: string;
  providerName: string;
  modelId?: string;
  endpoint: string;
  bodySizeBytes?: number;
  // Optional hook so callers can abort externally if needed
  signal?: AbortSignal;
}

export interface DiagnosedFetchResult<T = unknown> {
  response: Response;
  data: T;
  elapsedMs: number;
  responseSizeBytes: number;
  requestId: string;
}

/**
 * Drop-in replacement for raw `fetch` that adds:
 *  - auto-incrementing request IDs for console traceability
 *  - AbortController timeout (default 60 s) so the promise ALWAYS settles (no stuck spinners)
 *  - performance.now() timing
 *  - structured, grouped console diagnostics including HTTP status, bytes in/out, and elapsed ms
 *
 * Caller is responsible for checking response.ok / throwing.
 */
export async function diagnosedFetch<T = unknown>(
  opts: DiagnosedFetchOptions,
): Promise<DiagnosedFetchResult<T>> {
  __requestCounter += 1;
  const requestId = 'req-' + __requestCounter + '-' + Math.random().toString(36).slice(2, 7);
  const timeoutMs = opts.timeoutMs ?? 60000;
  const label = opts.label || 'request';

  const outerSignal = opts.signal;
  const abortCtl = new AbortController();
  if (outerSignal) {
    if (outerSignal.aborted) abortCtl.abort(outerSignal.reason);
    outerSignal.addEventListener('abort', () => abortCtl.abort(outerSignal.reason), { once: true });
  }
  const timeoutId = setTimeout(() => {
    abortCtl.abort(new Error('Request timed out after ' + timeoutMs + ' ms'));
  }, timeoutMs);

  const t0 = performance.now();
  console.groupCollapsed(
    '%c[AI ' + opts.providerName + '] ' + label + ' → ' + requestId +
    (opts.modelId ? ' | model=' + opts.modelId : ''),
    'color:#7c3aed; font-weight:600',
  );
  console.log('endpoint  :', opts.endpoint);
  console.log('method    :', opts.method || 'POST');
  console.log('timeout   :', timeoutMs, 'ms');
  if (opts.bodySizeBytes != null) {
    console.log('req bytes :', opts.bodySizeBytes);
  }
  console.log('started   :', new Date().toISOString());

  let elapsedMs = 0;
  try {
    const response = await fetch(opts.endpoint, {
      method: opts.method,
      headers: opts.headers,
      body: opts.body,
      mode: opts.mode,
      credentials: opts.credentials,
      cache: opts.cache,
      redirect: opts.redirect,
      referrer: opts.referrer,
      referrerPolicy: opts.referrerPolicy,
      integrity: opts.integrity,
      keepalive: opts.keepalive,
      signal: abortCtl.signal,
    });
    elapsedMs = Math.round(performance.now() - t0);

    const rawText = await response.text();
    const responseSizeBytes = new Blob([rawText]).size;

    console.log(
      '%cstatus    : %c' + response.status + ' ' + response.statusText,
      'color:' + (response.ok ? '#16a34a' : '#dc2626') + ';',
      'color:' + (response.ok ? '#16a34a' : '#dc2626') + '; font-weight:700;',
    );
    console.log('elapsed   :', elapsedMs, 'ms');
    console.log('res bytes :', responseSizeBytes);

    let data: T;
    try {
      data = (rawText.length > 0 ? JSON.parse(rawText) : ({} as T)) as T;
    } catch (_parseErr) {
      data = rawText as unknown as T;
    }

    if (!response.ok) {
      console.warn(
        '%cnon-2xx response body preview:',
        'color:#b45309; font-weight:600',
        typeof data === 'string' ? data.slice(0, 400) : data,
      );
    } else if (typeof data === 'object' && data != null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as Record<string, any>;
      if (d.usage) console.log('usage     :', d.usage);
      if (d.candidates && Array.isArray(d.candidates) && d.candidates[0]?.finishReason) {
        console.log('finish    :', d.candidates[0].finishReason);
      }
      if (d.choices && Array.isArray(d.choices) && d.choices[0]?.finish_reason) {
        console.log('finish    :', d.choices[0].finish_reason);
      }
    }

    return { response, data, elapsedMs, responseSizeBytes, requestId };
  } catch (err: unknown) {
    elapsedMs = Math.round(performance.now() - t0);
    const isAbort =
      (err instanceof DOMException && err.name === 'AbortError') ||
      (err instanceof Error && (err.message.includes('timeout') || err.message.includes('aborted')));
    console.log(
      '%c' + (isAbort ? 'TIMEOUT   :' : 'ERROR     :') + ' ' + elapsedMs + ' ms',
      'color:#dc2626; font-weight:700;',
      isAbort ? ('Timeout after ' + timeoutMs + ' ms') : err,
    );
    throw err;
  } finally {
    clearTimeout(timeoutId);
    console.log('completed :', new Date().toISOString(), '| total elapsed:', elapsedMs, 'ms');
    console.groupEnd();
  }
}

/**
 * Backstop timeout for MainPage:
 * Wrap a promise so it will reject (not hang forever) after `ms` even if
 * the underlying promise never settles.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error('Operation timed out' + (label ? ' (' + label + ')' : '') + ' after ' + ms + ' ms'));
    }, ms);
    promise.then(
      (v) => { clearTimeout(id); resolve(v); },
      (e) => { clearTimeout(id); reject(e); },
    );
  });
} 