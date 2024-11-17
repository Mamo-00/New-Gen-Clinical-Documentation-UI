import React from "react";
import { CssBaseline, useColorScheme, IconButton, Box } from "@mui/material";
import { ThemeProvider } from '@mui/material/styles'
import { theme } from "./theme";
import EditorComponent from "./components/EditorComponent";
import { Brightness4, Brightness7 } from "@mui/icons-material";

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
        <ColorModeToggle />
        <EditorComponent />
      </Box>
    </ThemeProvider>
  );
};

export default App;