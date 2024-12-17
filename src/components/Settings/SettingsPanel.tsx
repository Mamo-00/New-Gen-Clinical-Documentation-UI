import React from "react";
import { Box, FormControlLabel, Switch, Typography, Divider } from "@mui/material";

interface SettingsPanelProps {
  autocompleteEnabled: boolean;
  onAutocompleteToggle: (enabled: boolean) => void;
  templateLogicEnabled: boolean;
  onTemplateLogicToggle: (enabled: boolean) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  autocompleteEnabled,
  onAutocompleteToggle,
  templateLogicEnabled,
  onTemplateLogicToggle,
}) => {
  return (
    <Box sx={{ padding: 2, maxWidth: 400 }}>
      <Typography variant="h6">Editor Settings</Typography>
      <Divider sx={{ marginBottom: 2 }} />

      <FormControlLabel
        control={
          <Switch
            checked={autocompleteEnabled}
            onChange={(e) => onAutocompleteToggle(e.target.checked)}
          />
        }
        label="Enable Autocomplete"
      />

      <FormControlLabel
        control={
          <Switch
            checked={templateLogicEnabled}
            onChange={(e) => onTemplateLogicToggle(e.target.checked)}
          />
        }
        label="Enable Template Logic"
      />
    </Box>
  );
};

export default SettingsPanel;
