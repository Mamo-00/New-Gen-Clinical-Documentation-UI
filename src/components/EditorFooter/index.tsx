import React, { useEffect } from "react";
import { Typography, Box } from "@mui/material";
import { useEditor } from "../../context/EditorContext";

const EditorFooter: React.FC = () => {
  const { content, wordCount, setWordCount, lastSaved } = useEditor();

  useEffect(() => {
    setWordCount(content.split(/\s+/).filter(Boolean).length);
  }, [content]);

  return (
    <footer>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "GrayText",
        }}
      >
        <Typography variant="subtitle2">Status: Utkast</Typography>
        <Typography variant="subtitle2">Antall Ord: {wordCount}</Typography>
        <Typography variant="subtitle2">
          Sist Lagret: {lastSaved ? lastSaved.toLocaleTimeString() : "Aldri"}
        </Typography>
      </Box>
    </footer>
  );
};

export default EditorFooter;
