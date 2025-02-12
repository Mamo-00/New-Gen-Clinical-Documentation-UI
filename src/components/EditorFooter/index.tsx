import { Typography, Box } from "@mui/material";
import React from "react";

interface EditorFooterProps {
  wordCount: number;
  lastSaved: Date | null;
}

const EditorFooter: React.FC<EditorFooterProps> = ({
  wordCount,
  lastSaved,
}) => (
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

export default EditorFooter;
