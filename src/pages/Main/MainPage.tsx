import React, { useState, useEffect, useRef } from "react";
import {
  AccordionSummary,
  AccordionDetails,
  Accordion,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import EditorTextArea from "../../components/Editor/EditorTextArea";
import EditorControls from "../../components/Settings/EditorControls";
import DynamicTree from "../../components/Trees/DynamicTree";
import { useEditor } from "../../context/EditorContext";
import { useContainerWidth } from "../../utils/hooks/useContainerWidth";
import { Save } from "@mui/icons-material";
import { Undo } from "@mui/icons-material";
import { Redo } from "@mui/icons-material";
import FormatAlignLeftIcon from "@mui/icons-material/FormatAlignLeft";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTemplate } from "../../context/TemplateContext";
import { getSchemaAndInitialValues } from "../../utils/templates/getSchemaAndValues";
import TarmScreeningUI from "../../components/TarmScreening/TarmScreeningUI";
import AIConfigDialog from "../../components/Settings/AIConfigDialog";
import { ModelServiceFactory, ModelServiceType, ModelService } from "../../services/ModelServiceFactory";
import { AIProviderType } from "../../services/providers";
import { withTimeout } from "../../services/providers/BaseAIProvider";

interface MainToolbarProps {
  editorId: string;
  title: string;
}

const MainPage: React.FC = () => {
  const { handleSave, handleUndo, handleRedo, handleFormat, getContent, setContent } = useEditor();
  const { containerRef, showButtonText } = useContainerWidth(375);

  const { selectedTemplate } = useTemplate();

  // State for AI diagnosis generation
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [diagnosisStatus, setDiagnosisStatus] = useState<string | null>(null);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [inferenceMode, setInferenceMode] = useState<ModelServiceType>(
    localStorage.getItem('inference_mode') as ModelServiceType || ModelServiceType.REMOTE
  );
  const [modelService, setModelService] = useState<ModelService | null>(null);
  const [accordionExpanded, setAccordionExpanded] = useState(true);
  const [accordionExpandedMikro, setAccordionExpandedMikro] = useState(true);
  const tickerRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  
  // Initialize the model service
  useEffect(() => {
    const initializeService = async () => {
      try {
        // Get the inference mode from localStorage
        const storedInferenceMode = localStorage.getItem('inference_mode') as ModelServiceType || ModelServiceType.REMOTE;
        setInferenceMode(storedInferenceMode);

        // Get common settings
        const storedTemperature = parseFloat(localStorage.getItem('ai_temperature') || '0.7');
        const storedMaxTokens = parseInt(localStorage.getItem('ai_max_tokens') || '500', 10);
        
        let service;
        
        // Initialize based on inference mode
        if (storedInferenceMode === ModelServiceType.REMOTE) {
          // HuggingFace InferenceClient mode
          const storedApiKey = localStorage.getItem('ai_api_key') || '';
          const storedModelId = localStorage.getItem('ai_model_id') || 'mistralai/Mistral-7B-Instruct-v0.2';
          const storedTaskValue = localStorage.getItem('ai_task');
          const storedTask = (storedTaskValue === 'text-generation' || storedTaskValue === 'conversational') 
            ? storedTaskValue 
            : undefined;
          
          console.log('Initializing HuggingFace API service');
          console.log('Selected model:', storedModelId);
          
          service = ModelServiceFactory.getService(ModelServiceType.REMOTE);
          service.initialize({
            apiKey: storedApiKey,
            modelId: storedModelId,
            temperature: storedTemperature,
            maxTokens: storedMaxTokens,
            task: storedTask as 'text-generation' | 'conversational' | undefined
          });
        } else if (storedInferenceMode === ModelServiceType.LOCAL) {
          // Local transformers.js mode
          const storedLocalModelId = localStorage.getItem('ai_local_model_id') || 'HuggingFaceTB/SmolLM2-1.7B-Instruct:q4f16';
          
          console.log('Initializing local inference service');
          console.log('Selected local model:', storedLocalModelId);
          
          service = ModelServiceFactory.getService(ModelServiceType.LOCAL);
          await service.initialize({
            modelId: storedLocalModelId,
            temperature: storedTemperature,
            maxTokens: storedMaxTokens
          });
        } else if (storedInferenceMode === ModelServiceType.DIRECT) {
          // Direct provider API mode
          const storedProvider = localStorage.getItem('ai_provider') as AIProviderType || AIProviderType.HUGGINGFACE;
          const storedProviderApiKey = localStorage.getItem('ai_provider_api_key') || '';
          const storedProviderModelId = localStorage.getItem('ai_provider_model_id') || '';
          
          console.log('Initializing direct provider service:', storedProvider);
          console.log('Selected provider model:', storedProviderModelId);
          
          service = ModelServiceFactory.getService(ModelServiceType.DIRECT);
          await service.initialize({
            apiKey: storedProviderApiKey,
            modelId: storedProviderModelId,
            temperature: storedTemperature,
            maxTokens: storedMaxTokens,
            provider: storedProvider
          });
        }
        
        // Type assertion to assure TypeScript that service is a ModelService
        if (service) {
          setModelService(service as ModelService);
        } else {
          throw new Error('No valid inference mode selected or service initialization failed');
        }
      } catch (error) {
        console.error('Failed to initialize model service:', error);
        setDiagnosisError('Feil ved initialisering av AI-tjeneste. Sjekk konfigurasjonen i innstillinger.');
      }
    };
    
    initializeService();
  }, [inferenceMode]);

  // Handler for generating diagnosis
  const handleGenerateDiagnosis = async () => {
    // Safety: do nothing if already generating
    if (isGeneratingDiagnosis) return;

    setIsGeneratingDiagnosis(true);
    setDiagnosisError(null);
    setDiagnosisStatus('Klargjør forespørsel...');
    startedAtRef.current = Date.now();

    // Ticker that updates the status text every 1 s so user can see we haven't hung
    if (tickerRef.current != null) window.clearInterval(tickerRef.current);
    tickerRef.current = window.setInterval(() => {
      const t0 = startedAtRef.current;
      if (t0 == null) return;
      const sec = Math.floor((Date.now() - t0) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      let stage = 'Venter pa svar...';
      if (sec < 5) stage = 'Kobler til AI-tjeneste...';
      else if (sec < 15) stage = 'Leverer prompt til modellen...';
      else if (sec < 45) stage = 'Modellen tenker...';
      else if (sec < 90) stage = 'Venter pa lang svartekst...';
      else stage = 'Tar lang tid, fortsatt venter... (se Console for detaljer)';
      setDiagnosisStatus(stage + ' (' + mm + ':' + ss + ')');
    }, 1000);

    try {
      // Get the content from makroskopisk and mikroskopisk editors
      const makroskopiskText = getContent("makroskopisk");
      const mikroskopiskText = getContent("mikroskopisk");

      const inferMode = (localStorage.getItem('inference_mode') as ModelServiceType) || inferenceMode;
      const provName = inferMode === ModelServiceType.DIRECT
        ? (localStorage.getItem('ai_provider') as string | null)
        : inferMode === ModelServiceType.LOCAL ? 'LOCAL (transformers.js)' : 'REMOTE (HuggingFace)';
      const modelId = (() => {
        if (inferMode === ModelServiceType.REMOTE) return localStorage.getItem('ai_model_id');
        if (inferMode === ModelServiceType.LOCAL) return localStorage.getItem('ai_local_model_id');
        if (inferMode === ModelServiceType.DIRECT) return localStorage.getItem('ai_provider_model_id');
        return null;
      })();

      console.info(
        '%c[Generate] ' +
          'mode=' + inferMode +
          (provName ? ', provider=' + provName : '') +
          (modelId ? ', model=' + modelId : '') +
          ', makro=' + (makroskopiskText || '').length + ' chars' +
          ', mikro=' + (mikroskopiskText || '').length + ' chars',
        'color:#0369a1; font-weight:700',
      );

      // Check if we have content to work with
      if (!makroskopiskText && !mikroskopiskText) {
        setDiagnosisError('Mangler beskrivelse: bade makroskopisk og mikroskopisk beskrivelse er tomme.');
        return;
      }

      // Check if model service is initialized
      if (!modelService || !modelService.isInitialized()) {
        setDiagnosisError('AI-tjeneste er ikke konfigurert. Apne AI-innstillinger for a konfigurere tjenesten.');
        return;
      }

      setDiagnosisStatus('Sender forespørsel... (00:00)');

      // Ultimate safety: 5 minute timeout backstop at the UI layer so loading NEVER sticks forever,
      // even if a provider layer (e.g. WebGPU compile) hangs the promise.
      const diagnosis = await withTimeout<string>(
        modelService.generateDiagnosis(makroskopiskText, mikroskopiskText),
        5 * 60 * 1000,
        'generateDiagnosis',
      );

      // Handle error responses
      if (diagnosis.startsWith('Feil:')) {
        throw new Error(diagnosis);
      }

      // Update the konklusjon editor with the generated text
      setContent("konklusjon", diagnosis);
      const totalSec = startedAtRef.current ? Math.floor((Date.now() - startedAtRef.current) / 1000) : 0;
      setDiagnosisStatus('Ferdig! Brukte ' + totalSec + ' s. Output: ' + diagnosis.length + ' tegn.');

      // Auto-clear status after 3 s
      window.setTimeout(() => setDiagnosisStatus(null), 3000);

    } catch (error) {
      console.error("Error generating diagnosis:", error);

      // Check if it's an API limit error
      let msg: string;
      if (error instanceof Error &&
          (error.message.includes('429') ||
           error.message.includes('quota') ||
           error.message.includes('limit'))) {
        // Suggest using a different provider or local inference
        msg = 'API-grense naadd (429 / quota / kreditter oppbrukt). Prov a bytte til en annen AI-leverandor eller lokal inferens i AI-innstillingene.';
      } else if (error instanceof Error &&
                 (error.name === 'AbortError' ||
                  error.message.includes('timeout') ||
                  error.message.includes('timed out') ||
                  error.message.includes('Operation timed out'))) {
        msg = 'Forespørselen gikk i timeout. Sjekk nettverk/tildeling, eller bytt til en raskere modell (f.eks. Groq / Gemini Flash) eller lokal inferens.';
      } else {
        msg = error instanceof Error ? error.message : 'Det oppstod en feil ved generering av diagnose.';
        // Strip the inner "Feil ved generering..." double-wrapping if present
        msg = msg.replace(/^Feil ved generering av diagnose[^:]*:\s*Feil:\s*/, 'Feil: ');
        if (!msg.startsWith('Feil:') && !msg.includes('Feil ')) msg = 'Feil: ' + msg;
      }
      setDiagnosisError(msg);
    } finally {
      if (tickerRef.current != null) {
        window.clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      startedAtRef.current = null;
      setIsGeneratingDiagnosis(false);
    }
  };

  const Toolbar: React.FC<MainToolbarProps> = ({ editorId, title }) => {
    return (
      <Stack direction="row" justifyContent="space-between" sx={{ py: 1 }}>
        <Typography variant="h4" fontWeight={"bold"}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            gap: 1,
          }}
        >
          {/* Show Generate button only for konklusjon editor */}
          {editorId === "konklusjon" && (
            <>
              <Tooltip title="Generer diagnose basert på makroskopisk og mikroskopisk beskrivelse">
                <Button
                  onClick={handleGenerateDiagnosis}
                  variant="outlined"
                  color="secondary"
                  startIcon={isGeneratingDiagnosis ? <CircularProgress size={16} /> : <PsychologyIcon />}
                  size="small"
                  disabled={isGeneratingDiagnosis}
                  sx={{
                    minWidth: showButtonText ? "auto" : "40px",
                    "& .MuiButton-startIcon": {
                      mr: showButtonText ? 1 : 0,
                      ml: showButtonText ? 0 : 0,
                    },
                  }}
                >
                  {showButtonText ? "Generer" : ""}
                </Button>
              </Tooltip>
              <Tooltip title="AI-innstillinger">
                <IconButton
                  size="small"
                  onClick={() => setAiConfigOpen(true)}
                  sx={{ color: 'secondary.main' }}
                >
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Tooltip title="Formater tekst">
            <Button
              onClick={() => handleFormat(editorId)}
              variant="outlined"
              startIcon={<FormatAlignLeftIcon />}
              size="small"
              sx={{
                minWidth: showButtonText ? "auto" : "40px",
                "& .MuiButton-startIcon": {
                  mr: showButtonText ? 1 : 0,
                  ml: showButtonText ? 0 : 0,
                },
              }}
            >
              {showButtonText ? "Formater" : ""}
            </Button>
          </Tooltip>
          <Tooltip title="Angre (Ctrl+Z)">
            <Button
              onClick={() => handleUndo(editorId)}
              variant="outlined"
              startIcon={<Undo />}
              size="small"
              sx={{
                minWidth: showButtonText ? "auto" : "40px",
                "& .MuiButton-startIcon": {
                  mr: showButtonText ? 1 : 0,
                  ml: showButtonText ? 0 : 0,
                },
              }}
            >
              {showButtonText ? "" : ""}
            </Button>
          </Tooltip>
          <Tooltip title="Gjør om (Ctrl+Y)">
            <Button
              onClick={() => handleRedo(editorId)}
              variant="outlined"
              startIcon={<Redo />}
              size="small"
              sx={{
                minWidth: showButtonText ? "auto" : "40px",
                "& .MuiButton-startIcon": {
                  mr: showButtonText ? 1 : 0,
                  ml: showButtonText ? 0 : 0,
                },
              }}
            >
              {showButtonText ? "" : ""}
            </Button>
          </Tooltip>
          <Button
            onClick={() => handleSave(editorId)}
            variant="contained"
            startIcon={<Save />}
            size="small"
            sx={{
              minWidth: showButtonText ? "auto" : "40px",
              "& .MuiButton-startIcon": {
                mr: showButtonText ? 1 : 0,
                ml: showButtonText ? 0 : 0,
              },
            }}
          >
            {showButtonText ? "Lagre" : ""}
          </Button>
        </Box>
      </Stack>
    );
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        backgroundColor: "background.default",
      }}
    >
      <Grid container>
        <Grid size={3}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              width: "100%",
              overflow: "hidden",
              justifyContent: "center",
              my: "auto",
              p: 2,
              pt: 3,
              borderRight: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="h2" sx={{ fontWeight: "bold", mb: 1 }}>
              B24 00001
            </Typography>
          </Box>
        </Grid>
        <Grid size={9}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              height: "100%",
              width: "100%",
              overflow: "hidden",
              p: 1,
              pt: 2,
              pb: 0,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <EditorControls />
          </Box>
        </Grid>
        <Grid size={3}>
          <Box
            sx={{
              p: 0,
              pt: 0,
              borderRight: 1,
              borderColor: "divider",
              height: "100%",
            }}
          >
            <Box sx={{ mt: 0, p: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: "bold", mb: 1 }}
              >
                TXXXXX PXXXXX
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                (Colon Slyngereseksjon)
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Prøvetakingsdato:</span>
                <span>01.02.2024</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Prioritet:</span>
                <Chip label="CITO" size="small" color="error" />
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Glass:</span>
                <span>9</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Blokker:</span>
                <span>10</span>
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mb: 0.5,
                }}
              >
                <span>Snitt:</span>
                <span>10</span>
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                Klinisk opplysning:
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                3 mm polypp. kald slynge. dysplasi?
              </Typography>

              <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                Anatomisk lokalisasjon:
              </Typography>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                1/1: colon hø. fleksur
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Er prøven tatt i forbindelse med tarmscreeningsprogrammet?: Ja
              </Typography>
            </Box>
          </Box>
        </Grid>

        <Grid size={5}>
          <Box
            ref={containerRef}
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "1300px",
              width: "100%",
              overflow: "hidden",
              mx: "auto",
              p: 2,
              pt: 1,
              borderRight: 1,
              borderColor: "divider",
            }}
          >
            <Toolbar editorId="makroskopisk" title="Makroskopisk Beskrivelse" />
            <EditorTextArea editorId="makroskopisk" />

            <Toolbar editorId="mikroskopisk" title="Mikroskopisk Beskrivelse" />
            <EditorTextArea editorId="mikroskopisk" />

            <Toolbar editorId="konklusjon" title="Konklusjon/Diagnose" />
            <EditorTextArea editorId="konklusjon" />
          </Box>
        </Grid>

        <Grid size={4} sx={{ p: 2, borderLeft: 1,
              borderColor: "divider", }}>
          {selectedTemplate ? (
            // If a template is selected, get the corresponding schema and initial values.
            (() => {
              const { schema, initialValues } = getSchemaAndInitialValues(
                selectedTemplate.category
              );

              return (
                <Accordion
                  sx={{
                    backgroundColor: "background.default",
                    border: 2,
                    borderColor: "divider",
                  }}
                  expanded={accordionExpanded}
                  onChange={(_, isExpanded) => setAccordionExpanded(isExpanded)}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="makroskopi-content"
                    id="makroskopi-header"
                    sx={{ my: 0 }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ textTransform: "capitalize" }}
                    >{`Makroskopi - ${selectedTemplate.category}`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <DynamicTree
                      title={`Makroskopi - ${selectedTemplate.category}`}
                      schema={schema}
                      initialValues={initialValues}
                      editorId="makroskopisk"
                      itemLabel={selectedTemplate.category}
                    />
                  </AccordionDetails>
                </Accordion>
              );
            })()
          ) : (
            // Else, show a friendly prompt to the user.
            <Box sx={{ p: 2, border: "1px solid grey", borderRadius: 1 }}>
              <Typography variant="body1">
                Ingen mal er valgt. Vennligst velg en mal via "Maler" knappen på
                toppen av siden for trevisning. Du kan også skrive "template:" i 
                makroskopisk skrivefelt for få opp templat som du kan velge mellom for å 
                oppnå trevisning.
              </Typography>
            </Box>
          )}
          
          <Accordion
                  sx={{
                    backgroundColor: "background.default",
                    border: 2,
                    borderColor: "divider",
                    mt: 2
                  }}
                  expanded={accordionExpandedMikro}
                  onChange={(_, isExpanded) => setAccordionExpandedMikro(isExpanded)}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="mikroskopi-content"
                    id="mikroskopi-header"
                    sx={{ my: 0 }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ textTransform: "capitalize" }}
                    >{`Mikroskopisk Beskrivelse`}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TarmScreeningUI editorIdTarget="mikroskopisk" />
                  </AccordionDetails>
                </Accordion>
        </Grid>
      </Grid>
      
      {/* Error notification */}
      <Snackbar 
        open={diagnosisError !== null} 
        autoHideDuration={10000} 
        onClose={() => setDiagnosisError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setDiagnosisError(null)} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {diagnosisError}
        </Alert>
      </Snackbar>

      {/* Progress / status notification (info level) */}
      <Snackbar
        open={diagnosisStatus !== null && diagnosisError === null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setDiagnosisStatus(null)}
          severity={isGeneratingDiagnosis ? 'info' : 'success'}
          icon={isGeneratingDiagnosis ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ width: '100%' }}
        >
          {diagnosisStatus}
        </Alert>
      </Snackbar>
      
      {/* AI Configuration Dialog */}
      <AIConfigDialog
        open={aiConfigOpen}
        onClose={() => {
          setAiConfigOpen(false);
          // Re-initialize model service when config dialog is closed
          const newInferenceMode = localStorage.getItem('inference_mode') as ModelServiceType || ModelServiceType.REMOTE;
          if (newInferenceMode !== inferenceMode) {
            setInferenceMode(newInferenceMode);
          }
        }}
      />
    </Box>
  );
};

export default MainPage;
