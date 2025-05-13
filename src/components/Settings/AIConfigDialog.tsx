import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Slider,
  Link,
  Alert,
  FormControlLabel,
  Switch,
  SelectChangeEvent,
  Divider,
  Tabs,
  Tab,
  Paper,
} from "@mui/material";
import { ModelServiceFactory, ModelServiceType } from "../../services/ModelServiceFactory";
import { AI_PROVIDER_NAMES, AIProviderType } from "../../services/providers";
import MultiProviderService from "../../services/MultiProviderService";

// Define task type for better type safety
type TaskType = "text-generation" | "conversational";

// Models for remote inference (HuggingFace API via InferenceClient)
const REMOTE_MODEL_OPTIONS = [
  {
    id: "mistralai/Mistral-7B-Instruct-v0.2",
    name: "Mistral 7B Instruct v0.2",
    defaultTask: "conversational" as TaskType,
  },
  {
    id: "deepseek-ai/DeepSeek-Prover-V2-671B",
    name: "DeepSeek Prover 671B",
    defaultTask: "text-generation" as TaskType,
  },
  {
    id: "meta-llama/Llama-3.1-8B-Instruct",
    name: "Llama 3.1 8B Instruct (veldig bra)",
    defaultTask: "conversational" as TaskType,
  },
  {
    id: "Qwen/Qwen2.5-7B-Instruct",
    name: "Qwen 2.5 7B Instruct (anbefalt)",
    defaultTask: "conversational" as TaskType,
  },
  {
    id: "nvidia/Llama-3_1-Nemotron-Ultra-253B-v1",
    name: "Llama 3.1 Nemotron Ultra 253B",
    defaultTask: "conversational" as TaskType,
  },
  {
    id: "unsloth/DeepSeek-R1-Distill-Llama-70B",
    name: "DeepSeek R1 Distill Llama 70B",
    defaultTask: "text-generation" as TaskType,
  },
];

// Models for local inference (transformers.js)
// These are models that can be loaded and run in the browser
const LOCAL_MODEL_OPTIONS = [
  {
    id: "HuggingFaceTB/SmolLM2-1.7B-Instruct:q4f16",
    name: "SmolLM 1.7B Instruct (anbefalt for lokal)",
    description: "Liten og rask modell, optimalisert for lokalt bruk"
  },
  {
    id: "TheBloke/phi-2-GGUF",
    name: "Phi-2 3B (liten)",
    description: "Liten, effektiv modell fra Microsoft"
  },
  {
    id: "mlabonne/NeuralHermes-2.5-Mistral-7B-GGUF",
    name: "Neural Hermes 2.5 Mistral 7B",
    description: "Større modell med bedre kvalitet, krever mer minne"
  },
  {
    id: "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
    name: "TinyLlama 1.1B",
    description: "Svært liten og rask modell, fungerer på de fleste enheter"
  },
];

interface AIConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

// Tab panel interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`ai-tabpanel-${index}`}
      aria-labelledby={`ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

const AIConfigDialog: React.FC<AIConfigDialogProps> = ({ open, onClose }) => {
  // Tab state
  const [tabValue, setTabValue] = useState(0);
  
  // Legacy states
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState(REMOTE_MODEL_OPTIONS[0].id);
  const [localModelId, setLocalModelId] = useState(LOCAL_MODEL_OPTIONS[0].id);
  const [task, setTask] = useState<TaskType>("text-generation");
  const [autoDetectTask, setAutoDetectTask] = useState(true);
  const [inferenceMode, setInferenceMode] = useState<ModelServiceType>(
    localStorage.getItem('inference_mode') as ModelServiceType || ModelServiceType.REMOTE
  );
  
  // New direct provider states
  const [provider, setProvider] = useState<AIProviderType>(
    (localStorage.getItem('ai_provider') as AIProviderType) || AIProviderType.HUGGINGFACE
  );
  const [providerApiKey, setProviderApiKey] = useState("");
  const [providerModelId, setProviderModelId] = useState("");
  const [availableModels, setAvailableModels] = useState<Array<{id: string, name: string, category: string}>>([]);
  
  // Common states
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    // Set inference mode based on tab selection
    switch (newValue) {
      case 0: // Legacy HuggingFace
        setInferenceMode(ModelServiceType.REMOTE);
        break;
      case 1: // Direct Provider
        setInferenceMode(ModelServiceType.DIRECT);
        break;
      case 2: // Local
        setInferenceMode(ModelServiceType.LOCAL);
        break;
    }
  };

  // Update available models when provider changes
  useEffect(() => {
    if (inferenceMode === ModelServiceType.DIRECT) {
      // Create a temporary service to get the models
      const service = MultiProviderService.getInstance();
      service.setActiveProvider(provider);
      const models = service.getAvailableModels();
      setAvailableModels(models);
      
      // Set default model if none selected
      if (!providerModelId && models.length > 0) {
        setProviderModelId(models[0].id);
      }
    }
  }, [provider, inferenceMode]);

  // Load existing configuration on open
  useEffect(() => {
    if (open) {
      const storedApiKey = localStorage.getItem("ai_api_key") || "";
      const storedModelId =
        localStorage.getItem("ai_model_id") || REMOTE_MODEL_OPTIONS[0].id;
      const storedLocalModelId = 
        localStorage.getItem("ai_local_model_id") || LOCAL_MODEL_OPTIONS[0].id;
      const storedTaskValue = localStorage.getItem("ai_task");
      // Ensure the stored task is a valid TaskType
      const storedTask: TaskType =
        storedTaskValue === "text-generation" ||
        storedTaskValue === "conversational"
          ? (storedTaskValue as TaskType)
          : "text-generation";
      const storedTemperature = parseFloat(
        localStorage.getItem("ai_temperature") || "0.7"
      );
      const storedMaxTokens = parseInt(
        localStorage.getItem("ai_max_tokens") || "500",
        10
      );
      const storedAutoDetect =
        localStorage.getItem("ai_auto_detect_task") !== "false"; // Default to true
      const storedInferenceMode = 
        localStorage.getItem('inference_mode') as ModelServiceType || ModelServiceType.REMOTE;
      const storedProvider = 
        localStorage.getItem('ai_provider') as AIProviderType || AIProviderType.HUGGINGFACE;
      const storedProviderApiKey =
        localStorage.getItem("ai_provider_api_key") || "";
      const storedProviderModelId =
        localStorage.getItem("ai_provider_model_id") || "";

      // Set tab based on inference mode
      switch (storedInferenceMode) {
        case ModelServiceType.REMOTE:
          setTabValue(0);
          break;
        case ModelServiceType.DIRECT:
          setTabValue(1);
          break;
        case ModelServiceType.LOCAL:
          setTabValue(2);
          break;
        default:
          setTabValue(0);
      }
      
      // Set all saved values
      setApiKey(storedApiKey);
      setModelId(storedModelId);
      setLocalModelId(storedLocalModelId);
      setTask(storedTask);
      setTemperature(storedTemperature);
      setMaxTokens(storedMaxTokens);
      setAutoDetectTask(storedAutoDetect);
      setInferenceMode(storedInferenceMode);
      setProvider(storedProvider);
      setProviderApiKey(storedProviderApiKey);
      setProviderModelId(storedProviderModelId);
      setErrorMessage(null);

      // If auto-detect is enabled, set the task based on the selected model
      if (storedAutoDetect) {
        const selectedModel = REMOTE_MODEL_OPTIONS.find(
          (model) => model.id === storedModelId
        );
        if (selectedModel) {
          setTask(selectedModel.defaultTask);
        }
      }
    }
  }, [open]);

  // Update task when model changes (if auto-detect is enabled)
  useEffect(() => {
    if (autoDetectTask && inferenceMode === ModelServiceType.REMOTE) {
      const selectedModel = REMOTE_MODEL_OPTIONS.find((model) => model.id === modelId);
      if (selectedModel) {
        setTask(selectedModel.defaultTask);
      }
    }
  }, [modelId, autoDetectTask, inferenceMode]);

  const cleanApiKey = apiKey.trim();
  const cleanProviderApiKey = providerApiKey.trim();

  const handleSave = () => {
    // Validate the form based on inference mode
    if (inferenceMode === ModelServiceType.REMOTE && !cleanApiKey) {
      setErrorMessage("API-nøkkel er påkrevd for HuggingFace inferens");
      return;
    } else if (inferenceMode === ModelServiceType.DIRECT && !cleanProviderApiKey) {
      setErrorMessage(`API-nøkkel er påkrevd for ${AI_PROVIDER_NAMES[provider]} inferens`);
      return;
    }

    // Get the active model ID based on inference mode
    let activeModelId = "";
    if (inferenceMode === ModelServiceType.REMOTE) {
      activeModelId = modelId;
    } else if (inferenceMode === ModelServiceType.LOCAL) {
      activeModelId = localModelId;
    } else if (inferenceMode === ModelServiceType.DIRECT) {
      activeModelId = providerModelId;
    }

    // Save common settings to localStorage
    localStorage.setItem("ai_temperature", temperature.toString());
    localStorage.setItem("ai_max_tokens", maxTokens.toString());
    localStorage.setItem("inference_mode", inferenceMode);
    
    // Save mode-specific settings
    if (inferenceMode === ModelServiceType.REMOTE) {
      localStorage.setItem("ai_api_key", cleanApiKey);
      localStorage.setItem("ai_model_id", activeModelId);
      localStorage.setItem("ai_task", task);
      localStorage.setItem("ai_auto_detect_task", autoDetectTask.toString());
    } else if (inferenceMode === ModelServiceType.LOCAL) {
      localStorage.setItem("ai_local_model_id", activeModelId);
    } else if (inferenceMode === ModelServiceType.DIRECT) {
      localStorage.setItem("ai_provider", provider);
      localStorage.setItem("ai_provider_api_key", cleanProviderApiKey);
      localStorage.setItem("ai_provider_model_id", activeModelId);
    }

    // Debug log
    console.log("Saving inference mode:", inferenceMode);
    console.log("Saving model:", activeModelId);
    console.log("Saving temperature:", temperature);

    // Initialize the appropriate service based on inference mode
    if (inferenceMode === ModelServiceType.REMOTE) {
      // Update AI service configuration for remote inference
      const service = ModelServiceFactory.getService(ModelServiceType.REMOTE);
      service.initialize({
        apiKey: cleanApiKey,
        modelId: activeModelId || REMOTE_MODEL_OPTIONS[0].id,
        temperature,
        maxTokens,
        task,
      });
    } else if (inferenceMode === ModelServiceType.LOCAL) {
      // Initialize local model service
      const service = ModelServiceFactory.getService(ModelServiceType.LOCAL);
      service.initialize({
        modelId: activeModelId || LOCAL_MODEL_OPTIONS[0].id,
        temperature,
        maxTokens,
      });
    } else if (inferenceMode === ModelServiceType.DIRECT) {
      // Initialize direct provider service
      const service = ModelServiceFactory.getService(ModelServiceType.DIRECT);
      service.initialize({
        apiKey: cleanProviderApiKey,
        modelId: activeModelId || '',
        temperature,
        maxTokens,
        provider: provider
      });
    }

    onClose();
  };

  const handleTestConnection = async () => {
    // Validate based on inference mode
    if (inferenceMode === ModelServiceType.REMOTE && !cleanApiKey) {
      setErrorMessage("API-nøkkel er påkrevd for å teste HuggingFace tilkoblingen");
      return;
    } else if (inferenceMode === ModelServiceType.DIRECT && !cleanProviderApiKey) {
      setErrorMessage(`API-nøkkel er påkrevd for å teste ${AI_PROVIDER_NAMES[provider]} tilkoblingen`);
      return;
    }

    setIsTestingConnection(true);
    setErrorMessage(null);

    try {
      // Get the appropriate service based on inference mode
      const service = ModelServiceFactory.getService(inferenceMode);
      
      // Get the active model ID based on inference mode
      let activeModelId;
      if (inferenceMode === ModelServiceType.REMOTE) {
        activeModelId = modelId;
      } else if (inferenceMode === ModelServiceType.LOCAL) {
        activeModelId = localModelId;
      } else if (inferenceMode === ModelServiceType.DIRECT) {
        activeModelId = providerModelId;
      }
      
      // Update configuration with current form values
      if (inferenceMode === ModelServiceType.REMOTE) {
        service.initialize({
          apiKey: cleanApiKey,
          modelId: activeModelId || REMOTE_MODEL_OPTIONS[0].id,
          temperature,
          maxTokens,
          task,
        });
      } else if (inferenceMode === ModelServiceType.LOCAL) {
        await service.initialize({
          modelId: activeModelId || LOCAL_MODEL_OPTIONS[0].id,
          temperature,
          maxTokens,
        });
      } else if (inferenceMode === ModelServiceType.DIRECT) {
        await service.initialize({
          apiKey: cleanProviderApiKey,
          modelId: activeModelId || '',
          temperature,
          maxTokens,
          provider: provider
        });
      }

      // Test with a simple prompt
      const result = await service.generateDiagnosis(
        "Et lite prøveeksempel for å teste tilkoblingen.",
        "Denne teksten brukes kun for å verifisere at AI-modellen fungerer."
      );

      if (result.includes("Feil:")) {
        throw new Error(result);
      }

      setErrorMessage(null);
      // Success alert
      alert(`Tilkobling vellykket! Modellen fungerer.`);
    } catch (error) {
      console.error("Connection test failed:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : `Kunne ikke koble til AI-tjenesten. Sjekk konfigurasjonen.`
      );
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handle task selection with proper typing
  const handleTaskChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value;
    if (
      selectedValue === "text-generation" ||
      selectedValue === "conversational"
    ) {
      setTask(selectedValue);
    }
  };

  // Handle provider change
  const handleProviderChange = (event: SelectChangeEvent) => {
    const selectedValue = event.target.value as AIProviderType;
    setProvider(selectedValue);
    // Reset model selection when provider changes
    setProviderModelId('');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>AI-innstillinger for diagnosegenerering</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Typography variant="body2" component="p" sx={{ mb: 2 }}>
            Velg hvordan du vil generere diagnoser med AI - bruk HuggingFace via vårt API, koble direkte til AI-leverandører, eller kjør lokal inferens på din egen maskin.
          </Typography>

          <Paper sx={{ mb: 3 }}>
            <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
              <Tab label="HuggingFace API" id="ai-tab-0" />
              <Tab label="Direkte API-tilkobling" id="ai-tab-1" />
              <Tab label="Lokal inferens" id="ai-tab-2" />
            </Tabs>
          </Paper>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          {/* HuggingFace API Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="body2" component="p" sx={{ mb: 2 }}>
              Bruk HuggingFace API for å få tilgang til en rekke LLM-modeller. Du trenger en gyldig API-nøkkel. Besøk{" "}
              <Link
                href="https://huggingface.co/settings/tokens"
                target="_blank"
                rel="noopener"
              >
                HuggingFace Token Side
              </Link>{" "}
              for å opprette en gratis nøkkel.
            </Typography>

            <TextField
              margin="dense"
              label="HuggingFace API-nøkkel"
              type="password"
              fullWidth
              variant="outlined"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              error={!apiKey.trim() && errorMessage !== null}
              helperText={
                !apiKey.trim() && errorMessage !== null
                  ? "API-nøkkel er påkrevd for HuggingFace API"
                  : ""
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="model-select-label">AI-modell</InputLabel>
              <Select
                labelId="model-select-label"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                label="AI-modell"
              >
                {REMOTE_MODEL_OPTIONS.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name} (
                    {model.defaultTask === "text-generation"
                      ? "tekst-generering"
                      : "samtale"}
                    )
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Velg den AI-modellen som skal brukes via HuggingFace API
              </FormHelperText>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={autoDetectTask}
                  onChange={(e) => setAutoDetectTask(e.target.checked)}
                  color="primary"
                />
              }
              label="Automatisk oppgavetype basert på modell"
              sx={{ mb: 2 }}
            />

            {!autoDetectTask && (
              <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                <InputLabel id="task-select-label">API oppgavetype</InputLabel>
                <Select
                  labelId="task-select-label"
                  value={task}
                  onChange={handleTaskChange}
                  label="API oppgavetype"
                >
                  <MenuItem value="text-generation">Tekst-generering</MenuItem>
                  <MenuItem value="conversational">Samtale</MenuItem>
                </Select>
                <FormHelperText>
                  Velg oppgavetype for API-kallet (avansert)
                </FormHelperText>
              </FormControl>
            )}
          </TabPanel>

          {/* Direct Provider API Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="body2" component="p" sx={{ mb: 2 }}>
              Koble deg direkte til AI-leverandører som OpenAI, Anthropic Claude, DeepSeek eller Meta Llama. 
              Du trenger en API-nøkkel fra den valgte leverandøren.
            </Typography>

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="provider-select-label">AI-leverandør</InputLabel>
              <Select
                labelId="provider-select-label"
                value={provider}
                onChange={handleProviderChange}
                label="AI-leverandør"
              >
                {Object.entries(AI_PROVIDER_NAMES).map(([key, name]) => {
                  if (key !== AIProviderType.LOCAL) {
                    return (
                      <MenuItem key={key} value={key}>
                        {name}
                      </MenuItem>
                    );
                  }
                  return null;
                })}
              </Select>
              <FormHelperText>
                Velg hvilken AI-leverandør du vil bruke
              </FormHelperText>
            </FormControl>
            
            <TextField
              margin="dense"
              label={`${AI_PROVIDER_NAMES[provider]} API-nøkkel`}
              type="password"
              fullWidth
              variant="outlined"
              value={providerApiKey}
              onChange={(e) => setProviderApiKey(e.target.value)}
              required
              error={!providerApiKey.trim() && errorMessage !== null}
              helperText={
                !providerApiKey.trim() && errorMessage !== null
                  ? `API-nøkkel er påkrevd for ${AI_PROVIDER_NAMES[provider]}`
                  : ""
              }
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="provider-model-select-label">AI-modell</InputLabel>
              <Select
                labelId="provider-model-select-label"
                value={providerModelId}
                onChange={(e) => setProviderModelId(e.target.value)}
                label="AI-modell"
              >
                {availableModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Velg hvilken AI-modell du vil bruke fra {AI_PROVIDER_NAMES[provider]}
              </FormHelperText>
            </FormControl>
          </TabPanel>

          {/* Local Inference Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="body2" component="p" sx={{ mb: 2 }}>
              Kjør AI lokalt i nettleseren din uten å sende data til eksterne tjenester. Krever nedlastning av modeller.
            </Typography>

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel id="local-model-select-label">Lokal AI-modell</InputLabel>
              <Select
                labelId="local-model-select-label"
                value={localModelId}
                onChange={(e) => setLocalModelId(e.target.value)}
                label="Lokal AI-modell"
              >
                {LOCAL_MODEL_OPTIONS.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Velg den AI-modellen som skal lastes ned og kjøres på din enhet
              </FormHelperText>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Merk: Lokale modeller krever nedlastning av modellvekter (100MB-2GB) og vil bruke mer minne.
                Første gang du kjører en modell kan det ta ekstra tid å laste ned nødvendige filer.
              </Typography>
            </FormControl>
          </TabPanel>

          {/* Common settings for all modes */}
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
            Felles innstillinger
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography gutterBottom>
              Temperatur: {temperature.toFixed(1)}
            </Typography>
            <Slider
              value={temperature}
              onChange={(_, newValue) => setTemperature(newValue as number)}
              min={0}
              max={1}
              step={0.1}
              valueLabelDisplay="auto"
              marks={[
                { value: 0, label: "0.0" },
                { value: 0.5, label: "0.5" },
                { value: 1, label: "1.0" },
              ]}
            />
            <FormHelperText>
              Lavere verdier gir mer konsekvente resultater, høyere verdier gir
              mer kreative
            </FormHelperText>
          </Box>

          <TextField
            margin="dense"
            label="Maks tokens"
            type="number"
            fullWidth
            variant="outlined"
            value={maxTokens}
            onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 500)}
            slotProps={{
              htmlInput: { min: 100, max: 4096 },
            }}
            helperText="Maksimalt antall tokens i generert tekst (100-4096)"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={handleTestConnection}
          color="secondary"
          disabled={isTestingConnection || 
            (inferenceMode === ModelServiceType.REMOTE && !cleanApiKey) ||
            (inferenceMode === ModelServiceType.DIRECT && !cleanProviderApiKey)}
        >
          {isTestingConnection ? "Tester..." : "Test tilkobling"}
        </Button>
        <Button onClick={onClose}>Avbryt</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={(inferenceMode === ModelServiceType.REMOTE && !cleanApiKey) ||
                   (inferenceMode === ModelServiceType.DIRECT && !cleanProviderApiKey)}
        >
          Lagre
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIConfigDialog;
