import React from "react";
import { Box, FormControlLabel, Switch, Button } from "@mui/material";
import { Save, Undo } from "@mui/icons-material";
import { useEditor } from "../../context/EditorContext";
import { useContainerWidth } from "../../utils/hooks/useContainerWidth";
import TemplateManager from "../TemplateManager/TemplateManager";
import DictionaryInput from "../Dictionary/DictionaryInput";

const EditorControls: React.FC = () => {
  const {
    autoCompleteEnabled,
    setAutoCompleteEnabled,
    spellCheckEnabled,
    setSpellCheckEnabled,
    handleSave,
    handleUndo,
  } = useEditor();

  const { containerRef, showButtonText } = useContainerWidth(375);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mb: 2,
      }}
    >
      {/* Toggles Container */}
      

      {/* Buttons Container */}
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          minHeight: 48,
          flexShrink: 0,
        }}
      >
        <TemplateManager showButtonText={showButtonText} />
        <DictionaryInput showButtonText={showButtonText} />
        <FormControlLabel
          control={
            <Switch
              checked={autoCompleteEnabled}
              onChange={(e) => setAutoCompleteEnabled(e.target.checked)}
            />
          }
          label="Forslagsvisning"
        />

        <FormControlLabel
          control={
            <Switch
              checked={spellCheckEnabled}
              onChange={(e) => setSpellCheckEnabled(e.target.checked)}
            />
          }
          label="Stavekontroll"
        />
      </Box>
    </Box>
  );
};

export default EditorControls;
