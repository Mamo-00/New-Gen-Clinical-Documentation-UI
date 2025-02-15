import React from "react";
import { Box } from "@mui/material";
import Header from "../Header";
import EditorFooter from "../EditorFooter";
import EditorControls from "../Settings/EditorControls";
import AutocompleteTextArea from "./EditorTextArea";

const Editor: React.FC = () => {

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
      <AutocompleteTextArea />
      <EditorFooter />
    </Box>
  );
};

export default Editor;
