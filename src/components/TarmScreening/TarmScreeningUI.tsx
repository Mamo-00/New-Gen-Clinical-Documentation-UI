// src/components/Mikroskopi/TarmScreeningUI.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Stack,
  Paper,
  Select,
  Divider,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from "@mui/material";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useEditor } from "../../context/EditorContext";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  selectActiveMikroskopiStep,
  setActiveMikroskopiStep,
  resetAllMikroskopi,
  selectAllBlockDescriptions,
  resetAllMikroskopiForCurrentBlock,
  setTotalBlocksForCurrentLesion,
  setCurrentBlockIndex,
  selectCurrentBlockIndex,
  selectTotalBlocks,
  selectFieldValuesForCurrentBlock, // Use this for generateTextSnippet
  markCurrentBlockAsAnalogTo,
  selectCurrentBlockData,
} from "../../features/mikroskopiSlice"; // Adjust path
import RenderField from "./Renderer"; // Assuming Renderer.tsx is in the same folder

// Assume enhancedDictionary is imported and typed correctly
import enhancedDictionary from "../../data/dictionaries/enhanced-dictionary.json"; // Adjust path
import { FieldValue } from "../Trees/utilities/treeTypes";
import TreePagination from "../Trees/Pagination/TreePagination";
import { MikroskopiPanelField } from "./interface/iMikroskopiPanelField";
// Define the structure of steps
const steps = [
  {
    label: "Primærfunn / Kategori",
    panelIds: ["generalArchitecture", "serratedFeatures"],
  }, // Combine relevant starting points
  {
    label: "Detaljerte Funn",
    panelIds: [
      "cellularFeatures",
      "dysplasiaFeatures",
      "inflammatoryInfiltrate",
      "invasiveCarcinomaFeatures",
    ],
  }, // Details based on Step 1
  { label: "Andre Funn / Ancillær", panelIds: ["otherFindingsAndAncillary"] },
  { label: "Generer Beskrivelse", panelIds: [] },
];

interface TarmScreeningUIProps {
  editorIdTarget: string;
  initialTotalBlocks?: number;
}

export const TarmScreeningUI: React.FC<TarmScreeningUIProps> = ({
  editorIdTarget,
  initialTotalBlocks = 1,
}) => {
  const { getContent, setContent } = useEditor();
  const activeStep = useAppSelector(selectActiveMikroskopiStep);
  const dispatch = useAppDispatch();

  const allBlockData = useAppSelector(selectAllBlockDescriptions);
  const currentBlockIndex = useAppSelector(selectCurrentBlockIndex);
  const totalBlocks = useAppSelector(selectTotalBlocks);
  const currentBlockFieldValues = useAppSelector(
    selectFieldValuesForCurrentBlock
  );
  const currentBlockSpecificData = useAppSelector(selectCurrentBlockData);

  const [localTotalBlocks, setLocalTotalBlocks] = useState(totalBlocks);

  useEffect(() => {
    dispatch(setTotalBlocksForCurrentLesion(initialTotalBlocks));
    setLocalTotalBlocks(initialTotalBlocks);
  }, [initialTotalBlocks, dispatch]);

  useEffect(() => {
    // Sync localTotalBlocks with Redux state if it changes elsewhere
    setLocalTotalBlocks(totalBlocks);
  }, [totalBlocks]);

  const handleNext = () => {
    dispatch(setActiveMikroskopiStep(activeStep + 1));
  };

  const handleBack = () => {
    dispatch(setActiveMikroskopiStep(activeStep - 1));
  };

  const handleReset = () => {
    dispatch(resetAllMikroskopi());
    dispatch(setActiveMikroskopiStep(0));
  };

  const handleStepperResetForCurrentBlock = () =>
    dispatch(resetAllMikroskopiForCurrentBlock());

  const handleTotalBlocksChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const num = parseInt(event.target.value, 10);
    if (!isNaN(num) && num >= 1) {
      setLocalTotalBlocks(num);
      dispatch(setTotalBlocksForCurrentLesion(num));
    } else if (event.target.value === "") {
      setLocalTotalBlocks(1); // Or some other handling for empty input
    }
  };

  const handleBlockPageChange = (newPage: number) => {
    // newPage is 1-based
    dispatch(setCurrentBlockIndex(newPage - 1));
  };

  const handleAnalogToChange = (event: any) => {
    const value = event.target.value;
    if (value === "none" || value === "") {
      dispatch(markCurrentBlockAsAnalogTo(undefined));
    } else {
      dispatch(markCurrentBlockAsAnalogTo(Number(value)));
    }
  };

  // Helper function to evaluate conditional expressions
  const evaluateConditionalTemplate = (
    template: string,
    value: any,
    unit?: string
  ): string => {
    // Handle the specific patterns we've seen in our templates
    if (template.includes("{{value > 0 ?")) {
      const parts = template.split("{{value > 0 ?")[1].split(":");
      const truePart = parts[0].trim();
      const falsePart = parts[1].replace("}}", "").trim();

      if (value > 0) {
        // For JavaScript-like expressions with + operators, we need to evaluate them
        // Example: "Dybden av submukosal infiltrasjon er målt til  + value +   + unit + ."
        if (truePart.includes(" + ")) {
          // Split by + operator and reconstruct the string
          let result = truePart
            .split(" + ")
            .map((part) => {
              part = part.trim();
              if (part === "value") return value;
              if (part === "unit") return unit || "";
              // Handle empty string literals ('') as spaces
              if (part === "''" || part === '""') return " ";
              // Remove any quotes around string literals
              if (
                (part.startsWith("'") && part.endsWith("'")) ||
                (part.startsWith('"') && part.endsWith('"'))
              ) {
                return part.substring(1, part.length - 1);
              }
              return part;
            })
            .join("");

          return result;
        } else {
          // Simple replacement
          let result = truePart
            .replace(/value/g, value)
            .replace(/unit/g, unit || "");

          return result;
        }
      } else {
        // For empty string represented as '' in the template
        if (falsePart === "''") return " ";
        return falsePart;
      }
    } else if (template.includes("{{value ?")) {
      const parts = template.split("{{value ?")[1].split(":");
      const truePart = parts[0].trim();
      const falsePart = parts[1].replace("}}", "").trim();

      if (value) {
        // Handle JavaScript-like expressions in the true part
        if (truePart.includes(" + ")) {
          let result = truePart
            .split(" + ")
            .map((part) => {
              part = part.trim();
              if (part === "value") return value;
              // Handle empty string literals ('') as spaces
              if (part === "''" || part === '""') return " ";
              // Remove any quotes around string literals
              if (
                (part.startsWith("'") && part.endsWith("'")) ||
                (part.startsWith('"') && part.endsWith('"'))
              ) {
                return part.substring(1, part.length - 1);
              }
              return part;
            })
            .join("");

          return result;
        }
        return truePart;
      } else {
        // For empty string represented as '' in the template
        if (falsePart === "''") return " ";
        return falsePart;
      }
    } else {
      // Simple value replacement
      return template.replace(/\{\{value\}\}/g, String(value));
    }
  };

  // --- Text Generation Logic (Simplified - adapt as needed) ---
  const generateTextSnippetForBlock = useCallback(
    (blockIdx: number): string => {
      const blockData = allBlockData[blockIdx];
      if (!blockData) return "";
      if (blockData.isAnalogTo !== undefined) {
        return `Blokk #${blockData.blockNumber} er analog til blokk #${blockData.isAnalogTo}.`;
      }

      let generatedSnippets: string[] = [];
      const panelOrderForText = [
        "generalArchitecture",
        "serratedFeatures",
        "cellularFeatures",
        "dysplasiaFeatures",
        "inflammatoryInfiltrate",
        "invasiveCarcinomaFeatures",
        "otherFindingsAndAncillary",
      ];

      panelOrderForText.forEach((panelId) => {
        const panelSchema = enhancedDictionary.mikroskopiPanels.find(
          (p) => p.id === panelId
        );
        const panelValues = blockData.fieldValues[panelId] || {};

        if (panelSchema) {
          panelSchema.fields.forEach((field) => {
            const currentValue = panelValues[field.id];
            const defaultValue = field.defaultValue;

            // Check conditional visibility based on CURRENT state
            let shouldGenerate = true;
            if (field.conditionalOn) {
              let dependentValue: FieldValue | undefined;
              Object.keys(blockData.fieldValues).forEach((pId) => {
                // Check within current block's values
                if (
                  blockData.fieldValues[pId]?.[field.conditionalOn!] !==
                  undefined
                ) {
                  dependentValue =
                    blockData.fieldValues[pId][field.conditionalOn!];
                }
              });

              if (
                "conditionalValue" in field &&
                field.conditionalValue !== undefined &&
                dependentValue !== field.conditionalValue
              ) {
                shouldGenerate = false;
              }
              if (
                "conditionalValue_not" in field &&
                field.conditionalValue_not !== undefined &&
                dependentValue === field.conditionalValue_not
              ) {
                shouldGenerate = false;
              }
            }

            if (shouldGenerate && field.generatesText) {
              let textToAdd: string | null = null;

              if (field.type === "checkbox") {
                const value = Boolean(currentValue ?? field.defaultValue);
                if (field.generatesText.includes("{{value ?")) {
                  if (value) {
                    const parts = field.generatesText.split("?")[1]?.split(":");
                    if (parts && parts.length > 0)
                      textToAdd = parts[0].trim().replace("}}", "");
                  } else {
                    const parts = field.generatesText.split(":");
                    if (parts.length > 1)
                      textToAdd = parts[1].trim().replace("}}", "");
                  }
                } else {
                  if (value) {
                    textToAdd = field.generatesText.replace(
                      /\{\{value\}\}/g,
                      "påtruffet"
                    );
                  }
                }
              } else if (field.type === "checkboxGroup") {
                const groupValues =
                  (currentValue as Record<string, boolean>) ?? {};
                const selectedOptions = Object.entries(groupValues)
                  .filter(([, isSelected]) => isSelected)
                  .map(([option]) => option);
                if (selectedOptions.length > 0) {
                  if (field.generatesText) {
                    textToAdd = field.generatesText.replace(
                      /\{\{value\}\}/g,
                      selectedOptions.join(", ")
                    );
                  }
                }
              } else if (
                currentValue !== undefined &&
                currentValue !== field.defaultValue
              ) {
                // Generate text for other types ONLY if the value is explicitly set
                // AND different from the default value.
                // Exception: Allow number fields with value 0 if default is also 0 (like mitoticCount)
                const isMeaningfulZero =
                  field.type === "number" &&
                  Number(currentValue) === 0 &&
                  Number(defaultValue) === 0;

                const valueAsString = String(currentValue);
                const defaultAsString = String(defaultValue);

                if (
                  valueAsString.trim() !== defaultAsString.trim() ||
                  isMeaningfulZero
                ) {
                  // Check if generatesText template exists before replacing
                  if (field.generatesText) {
                    // Handle conditional expressions in the template
                    if (
                      field.generatesText.includes("{{value >") ||
                      field.generatesText.includes("{{value ?")
                    ) {
                      textToAdd = evaluateConditionalTemplate(
                        field.generatesText,
                        currentValue,
                        "unit" in field ? field.unit : undefined
                      );
                    } else {
                      textToAdd = field.generatesText.replace(
                        /\{\{value\}\}/g,
                        valueAsString
                      );
                      // Add unit back
                      if (
                        "unit" in field &&
                        field.unit &&
                        textToAdd.includes(valueAsString)
                      ) {
                        textToAdd = textToAdd.replace(
                          valueAsString,
                          `${valueAsString} ${field.unit}`
                        );
                      }
                    }
                  }
                }
              }

              if (textToAdd && textToAdd.trim()) {
                textToAdd = textToAdd.trim();
                if (![".", "!", "?"].includes(textToAdd.slice(-1))) {
                  textToAdd += ".";
                }
                generatedSnippets.push(textToAdd);
              }
            }
          });
        }
      });

      const combinedText =
        generatedSnippets.length > 1
          ? generatedSnippets.join(" ")
          : generatedSnippets[0] || "";
      return combinedText
        ? `#${blockData.blockNumber}: ${combinedText}`
        : `#${blockData.blockNumber}: Ingen spesifikke strukturerte funn angitt.`;
    },
    [allBlockData]
  );

  const handleGenerateAndPasteAllBlocks = useCallback(() => {
    let fullReportSnippet = "";
    for (let i = 0; i < totalBlocks; i++) {
      const blockSnippet = generateTextSnippetForBlock(i);
      if (blockSnippet) {
        fullReportSnippet += (fullReportSnippet ? "\n\n" : "") + blockSnippet;
      }
    }

    if (fullReportSnippet.trim()) {
      const currentEditorContent = getContent(editorIdTarget);
      const separator = currentEditorContent.trim() ? "\n\n" : "";
      const newContent = currentEditorContent + separator + fullReportSnippet;
      setContent(editorIdTarget, newContent);
    }
  }, [
    generateTextSnippetForBlock,
    totalBlocks,
    setContent,
    editorIdTarget,
    allBlockData,
    dispatch,
  ]);

  // Function to get fields for the current step
  const getFieldsForStep = (stepIndex: number): MikroskopiPanelField[] => {
    const panelIds = steps[stepIndex]?.panelIds || [];
    let fields: MikroskopiPanelField[] = [];
    panelIds.forEach((panelId) => {
      const panel = enhancedDictionary.mikroskopiPanels.find(
        (p) => p.id === panelId
      );
      if (panel) {
        fields = fields.concat(
          panel.fields.map((f) => ({
            ...(f as unknown as MikroskopiPanelField),
            panelId,
          }))
        );
      }
    });
    return fields;
  };

  const currentBlockNumber = currentBlockSpecificData
    ? currentBlockSpecificData.blockNumber
    : currentBlockIndex + 1;

  const isCurrentBlockAnalog =
    currentBlockSpecificData?.isAnalogTo !== undefined;

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Mikroskopisk Beskrivelse
      </Typography>

      {/* Block Management Section */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <TextField
            label="Totalt Antall Blokk"
            type="number"
            size="small"
            value={localTotalBlocks}
            onChange={handleTotalBlocksChange}
            slotProps={{ htmlInput: { min: 1 } }}
            sx={{ width: 150 }}
          />
          {totalBlocks > 1 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="analog-to-label">
                Blokk #{currentBlockNumber} er analog til
              </InputLabel>
              <Select
                labelId="analog-to-label"
                label={`Blokk #${currentBlockNumber} er analog til`}
                value={currentBlockSpecificData?.isAnalogTo ?? "none"}
                onChange={handleAnalogToChange}
              >
                <MenuItem value="none">
                  <em>Ikke analog (unik beskrivelse)</em>
                </MenuItem>
                {allBlockData
                  .filter((b) => b.blockNumber !== currentBlockNumber) // Don't allow analog to self
                  .map((b) => (
                    <MenuItem key={b.blockNumber} value={b.blockNumber}>
                      Blokk #{b.blockNumber}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </Stack>
        {totalBlocks > 1 && (
          <Box sx={{ mt: 1.5 }}>
            <TreePagination
              totalItems={totalBlocks}
              currentPage={currentBlockIndex + 1}
              setCurrentPage={handleBlockPageChange}
              itemsPerPage={1}
              itemLabel="Blokk"
              position="top"
              displayInfo={{
                start: currentBlockIndex + 1,
                end: currentBlockIndex + 1,
                total: totalBlocks,
              }}
            />
          </Box>
        )}
        {/* Stepper UI for the Current Block */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Beskrivelse for Blokk #{currentBlockNumber}
          {isCurrentBlockAnalog &&
            ` (Analog til Blokk #${currentBlockSpecificData?.isAnalogTo})`}
        </Typography>

        {isCurrentBlockAnalog ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              p: 2,
              border: "1px dashed grey",
              borderRadius: 1,
              textAlign: "center",
            }}
          >
            {`Denne blokken er merket som analog. Feltene nedenfor viser verdiene
          fra Blokk #${currentBlockSpecificData?.isAnalogTo}. Endring av feltene
          vil fjerne "analog til"-merkingen.`}
          </Typography>
        ) : null}

        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, index) => (
            <Step key={`${currentBlockIndex}-${step.label}`}>
              <StepLabel
                onClick={() => dispatch(setActiveMikroskopiStep(index))}
                sx={{ cursor: "pointer", py: 1 }}
              >
                {step.label}
              </StepLabel>
              <StepContent
                sx={{
                  borderLeft: "1px solid",
                  borderColor: "divider",
                  pl: 2,
                  ml: "11px",
                  pb: 1,
                  pt: 0.5,
                }}
              >
                <Button
                  size="small"
                  onClick={handleStepperResetForCurrentBlock}
                  startIcon={<RestartAltIcon />}
                >
                  {`Tilbakestill Funn for Blokk #${currentBlockNumber}`}
                </Button>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1,
                    backgroundColor: "transparent",
                  }}
                >
                  <Stack spacing={1}>
                    {getFieldsForStep(index).map((field) => {
                      const panelValuesForCurrentBlock =
                        currentBlockFieldValues[field.panelId] || {};
                      const currentValue = panelValuesForCurrentBlock[field.id];
                      return (
                        <RenderField
                          key={`${currentBlockIndex}-${field.panelId}-${field.id}`}
                          panelId={field.panelId}
                          field={field}
                          currentValue={currentValue}
                          allPanelValues={panelValuesForCurrentBlock}
                        />
                      );
                    })}
                  </Stack>
                </Paper>
                <Box sx={{ mt: 1.5, mb: 0.5 }}>
                  <Box>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{ mr: 1 }}
                      disabled={activeStep === steps.length - 1}
                      size="small"
                    >
                      Neste
                    </Button>
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mr: 1 }}
                      size="small"
                    >
                      Tilbake
                    </Button>
                    {activeStep === steps.length - 1 && (
                      <Paper
                        square
                        elevation={0}
                        sx={{ p: 2, mt: 1, textAlign: "center" }}
                      >
                        <Typography variant="body2" gutterBottom>
                          {`Alle beskrivelsessteg for Blokk #${currentBlockNumber} er fullført.
                        fullført.`}
                        </Typography>
                        <Button
                          onClick={handleGenerateAndPasteAllBlocks}
                          sx={{ mt: 1, mr: 1 }}
                          variant="contained"
                        >
                          Generer og Lim inn
                        </Button>
                        <Button onClick={handleReset} sx={{ mt: 1, mr: 1 }}>
                          Tilbakestill
                        </Button>
                      </Paper>
                    )}
                  </Box>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </Paper>
      <Divider sx={{ my: 2 }} />
    </Box>
  );
};

export default TarmScreeningUI; // Export with the new name
