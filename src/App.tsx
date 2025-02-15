import React from "react";
import {
  CssBaseline,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme";

import { EditorProvider } from "./context/EditorContext";
import ResizableDialog from "./components/ResizableDialog";

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EditorProvider>
        <ResizableDialog />
      </EditorProvider>
    </ThemeProvider>
  );
};

export default App;
