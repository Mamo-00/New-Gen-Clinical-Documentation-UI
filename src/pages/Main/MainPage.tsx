import React, { useState, useEffect } from "react";
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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PsychologyIcon from "@mui/icons-material/Psychology";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTemplate } from "../../context/TemplateContext";
import { getSchemaAndInitialValues } from "../../utils/templates/getSchemaAndValues";
import TarmScreeningUI from "../../components/TarmScreening/TarmScreeningUI";
import AIConfigDialog from "../../components/Settings/AIConfigDialog";
import { ModelServiceFactory, ModelServiceType, ModelService } from "../../services/ModelServiceFactory";
import { AIProviderType } from "../../services/providers";

interface MainToolbarProps {
  editorId: string;
  title: string;
}

const MainPage: React.FC = () => {
  const { handleSave, handleUndo, getContent, setContent } = useEditor();
  const { containerRef, showButtonText } = useContainerWidth(375);

  const { selectedTemplate } = useTemplate();

  // State for AI diagnosis generation
  const [isGeneratingDiagnosis, setIsGeneratingDiagnosis] = useState(false);
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [inferenceMode, setInferenceMode] = useState<ModelServiceType>(
    localStorage.getItem('inference_mode') as ModelServiceType || ModelServiceType.REMOTE
  );
  const [modelService, setModelService] = useState<ModelService | null>(null);
  
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
    setIsGeneratingDiagnosis(true);
    setDiagnosisError(null);
    
    try {
      // Get the content from makroskopisk and mikroskopisk editors
      const makroskopiskText = getContent("makroskopisk");
      const mikroskopiskText = getContent("mikroskopisk");
      
      // Check if we have content to work with
      if (!makroskopiskText && !mikroskopiskText) {
        setDiagnosisError("Mangler beskrivelse: både makroskopisk og mikroskopisk beskrivelse er tomme.");
        setIsGeneratingDiagnosis(false);
        return;
      }
      
      // Check if model service is initialized
      if (!modelService || !modelService.isInitialized()) {
        setDiagnosisError(`AI-tjeneste er ikke konfigurert. Åpne AI-innstillinger for å konfigurere tjenesten.`);
        setIsGeneratingDiagnosis(false);
        return;
      }
      
      // Generate the diagnosis using the current model service
      const diagnosis = await modelService.generateDiagnosis(makroskopiskText, mikroskopiskText);
      
      // Handle error responses
      if (diagnosis.startsWith('Feil:')) {
        throw new Error(diagnosis);
      }
      
      // Update the konklusjon editor with the generated text
      setContent("konklusjon", diagnosis);
      
    } catch (error) {
      console.error("Error generating diagnosis:", error);
      
      // Check if it's an API limit error
      if (error instanceof Error && 
          (error.message.includes('429') || 
           error.message.includes('quota') || 
           error.message.includes('limit'))) {
        
        // Suggest using a different provider or local inference
        setDiagnosisError("API-grense nådd. Prøv å bytte til en annen AI-leverandør eller lokal inferens i AI-innstillingene.");
      } else {
        // General error handling
        const errorMessage = error instanceof Error ? error.message : 'Det oppstod en feil ved generering av diagnose.';
        setDiagnosisError(errorMessage);
      }
    } finally {
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
          <Button
            onClick={handleUndo}
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
            {showButtonText ? "Angre" : ""}
          </Button>
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
                  expanded={true}
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
                toppen av siden for å vise treet.
              </Typography>
            </Box>
          )}
          <TarmScreeningUI editorIdTarget="mikroskopisk" />
        </Grid>
      </Grid>
      
      {/* Error notification */}
      <Snackbar 
        open={diagnosisError !== null} 
        autoHideDuration={6000} 
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
