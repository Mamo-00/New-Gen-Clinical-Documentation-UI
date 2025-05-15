import React from "react";
import { Box } from "@mui/material";
import Header from "../Header";
import EditorFooter from "../EditorFooter";
import EditorControls from "../Settings/EditorControls";
import EditorTextArea from "./EditorTextArea";
import TemplateHintBar from "./TemplateHintBar";
import "../../styles/editor.css"; // Import editor styles

const Editor: React.FC = () => {
  // Default to makroskopisk editor ID
  const defaultEditorId = "makroskopisk";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        mx: "auto",
        p: 1,
        my: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Header />
      <EditorControls />
      <TemplateHintBar />
      <EditorTextArea editorId={defaultEditorId} />
      <EditorFooter />
    </Box>
  );
};

export default Editor;
