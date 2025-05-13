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
  return `${corsProxies[0]}${encodeURIComponent(url)}`;
}

// Utility function to create standard diagnosis prompts
export function createDiagnosisPrompt(makroText: string, mikroText: string): string {
  return `
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
- Inkluder kun funn som faktisk er beskrevet i prøven - IKKE bruk eksemplet som mal

MAKROSKOPISK BESKRIVELSE:
${makroText || 'Ingen makroskopisk beskrivelse tilgjengelig.'}

MIKROSKOPISK BESKRIVELSE:
${mikroText || 'Ingen mikroskopisk beskrivelse tilgjengelig.'}

KONKLUSJON/DIAGNOSE (basert UTELUKKENDE på de faktiske funnene i prøven ovenfor):`;
}

// Error handling utility for provider services
export function handleProviderError(error: unknown, providerName: string): string {
  console.error(`${providerName} API error:`, error);
  
  if (error instanceof Error) {
    if (error.message.includes('401') || error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return `Feil: API-nøkkel mangler eller er ugyldig for ${providerName}. Vennligst sjekk innstillingene.`;
    } else if (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('quota')) {
      return `Feil: For mange forespørsler til ${providerName}. Vennligst prøv igjen senere.`;
    } else if (error.message.includes('503') || error.message.includes('service unavailable')) {
      return `Feil: ${providerName} er midlertidig utilgjengelig. Vennligst prøv igjen senere.`;
    } else if (error.message.includes('404') || error.message.includes('not found')) {
      return `Feil: Modellen ble ikke funnet på ${providerName}. Vennligst velg en annen modell.`;
    } else if (error.message.includes('403') || error.message.includes('forbidden')) {
      return `Feil: Ingen tilgang til modellen på ${providerName}. Vennligst sjekk at API-nøkkelen har riktige tilganger.`;
    } else if (error.message.includes('CORS') || error.message.includes('cors')) {
      return `Feil: CORS-problemer med ${providerName} API. Prøv å aktivere CORS-proxy i innstillingene eller bruk en backend-proxy.`;
    }
    
    return `Feil fra ${providerName}: ${error.message}`;
  }
  
  return `Feil ved generering av diagnose via ${providerName}. Vennligst prøv igjen senere.`;
} 