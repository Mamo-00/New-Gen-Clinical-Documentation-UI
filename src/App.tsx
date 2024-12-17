import { scan } from 'react-scan';
import React, { useState } from "react";
import { CssBaseline, useColorScheme, IconButton, Box } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { ThemeProvider } from '@mui/material/styles'
import { theme } from "./theme";
import Editor from "./components/Editor/Editor";
import SettingsPanel from "./components/Settings/SettingsPanel";
import { Brightness4, Brightness7 } from "@mui/icons-material";

scan({
  enabled: true,
  log: true, 
});

const ColorModeToggle = () => {
  const { mode, setMode } = useColorScheme();
  

  const toggleColorMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  return (
    <IconButton 
      onClick={toggleColorMode} 
      color="inherit" 
      sx={{ 
        position: 'absolute', 
        top: 10, 
        right: 10,
        zIndex: 1000
      }}
    >
      {mode === "light" ? <Brightness4 /> : <Brightness7 />}
    </IconButton>
  );
};

const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
const [templateLogicEnabled, setTemplateLogicEnabled] = useState(false);

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        width: '100%', 
        height: '100vh', 
        backgroundColor: 'background.default',
        position: 'relative'
      }}>
        <Grid container spacing={2}>
      <Grid size={3}>
        <SettingsPanel
          autocompleteEnabled={autocompleteEnabled}
          onAutocompleteToggle={setAutocompleteEnabled}
          templateLogicEnabled={templateLogicEnabled}
          onTemplateLogicToggle={setTemplateLogicEnabled}
        />
      </Grid>
      <Grid size={9}>
        <Editor
          autocompleteEnabled={autocompleteEnabled}
          templateLogicEnabled={templateLogicEnabled}
        />
      </Grid>
    </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default App;