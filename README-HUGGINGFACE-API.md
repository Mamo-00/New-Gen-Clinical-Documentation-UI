# AI-Generert Diagnose med HuggingFace API

Dette dokumentet forklarer hvordan du setter opp og bruker funksjonen for AI-generert diagnose i journalsystemet.

## Hva er HuggingFace?

[HuggingFace](https://huggingface.co/) er en ledende plattform for maskinlæringsmodeller og API-er, spesielt innen naturlig språkbehandling. Vi bruker HuggingFace API for å generere diagnoseforslag basert på makroskopiske og mikroskopiske beskrivelser.

## Hvordan få en API-nøkkel

1. Gå til [HuggingFace](https://huggingface.co/) og opprett en konto (eller logg inn hvis du allerede har en)
2. Naviger til [Settings > Access Tokens](https://huggingface.co/settings/tokens)
3. Klikk på "New token"
4. Gi token et navn (f.eks. "Journalsystem")
5. Velg "Read" tilgangsrettigheter (dette er tilstrekkelig for API-bruk)
6. Klikk på "Generate token"
7. Kopier token-verdien - du vil trenge denne for å konfigurere systemet

## Konfigurere systemet

Det er to måter å konfigurere API-nøkkelen:

### Alternativ 1: Via brukergrensesnittet (anbefalt)

1. Klikk på tannhjulikonet ved siden av "Generer" knappen i Konklusjon/Diagnose-seksjonen
2. Lim inn API-nøkkelen i feltet for "HuggingFace API-nøkkel"
3. Velg ønsket språkmodell fra nedtrekksmenyen
   - "LLaMA Norwegian" er anbefalt for best resultat på norsk
4. Juster temperatur etter behov (lavere verdier = mer konsistente resultater)
5. Klikk "Test tilkobling" for å verifisere at API-nøkkelen fungerer
6. Klikk "Lagre" for å lagre innstillingene

### Alternativ 2: Via miljøvariabler

1. Opprett en `.env` fil i rotmappen for prosjektet
2. Legg til følgende linjer:
   ```
   VITE_HUGGINGFACE_API_KEY=din-api-nøkkel-her
   VITE_HUGGINGFACE_MODEL_ID=elinas/llama-2-7b-chat-norwegian
   ```
3. Start applikasjonen på nytt for at endringene skal tre i kraft

## Bruke diagnosegenereringsfunksjonen

1. Fyll inn makroskopisk og mikroskopisk beskrivelse i de respektive feltene
2. Klikk på "Generer" knappen i "Konklusjon/Diagnose" seksjonen
3. Systemet vil bruke AI til å analysere tekstene og generere et forslag til diagnose
4. Gjennomgå og rediger diagnoseteksten etter behov

## Tips for best resultater

1. **Detaljerte beskrivelser**: Jo mer detaljerte de makroskopiske og mikroskopiske beskrivelsene er, desto bedre blir diagnoseforslagene
2. **Fagterminologi**: Bruk standard medisinsk terminologi i beskrivelsene
3. **Lengde**: Unngå for korte beskrivelser, men vær også presis og unngå unødvendig tekst
4. **Modellvalg**: For norske tekster, bruk den norske språkmodellen for best resultat

## Feilsøking

Hvis du opplever problemer med diagnosegenerering:

1. Sjekk at API-nøkkelen er riktig konfigurert
2. Verifiser at du har internettilkobling
3. Sjekk at du har valgt en kompatibel språkmodell
4. Prøv å justere temperaturinnstillingen
5. Sjekk for feilmeldinger i nettleserens konsoll

## Vanlige feilmeldinger

- **"API-nøkkel er ikke konfigurert"**: Konfigurer API-nøkkelen via tannhjulikonet
- **"Kunne ikke koble til HuggingFace API"**: Sjekk internettilkoblingen og at API-nøkkelen er gyldig
- **"For mange forespørsler"**: Du har nådd HuggingFace API-begrensninger, vent litt og prøv igjen

## Datapersonvern

Vær oppmerksom på at tekst sendt til HuggingFace API blir overført til deres servere. Ikke inkluder pasientidentifiserbar informasjon i beskrivelsene. 