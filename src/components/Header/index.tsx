import React from "react";
import { Typography, Box, IconButton, Chip } from "@mui/material";
import { PushPin, PushPinOutlined } from "@mui/icons-material";
import { useEditor } from "../../context/EditorContext";

const Header: React.FC = () => {
  const { handlePin, pinned } = useEditor();

  return (
    <>
      <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: "bold" }}>
          Prep.nr. B18 00125 – Mikroskopi
        </Typography>

        <IconButton
          onClick={handlePin}
          size="small"
          sx={{ ml: "auto" }} // Push to the right
        >
          {pinned ? <PushPin /> : <PushPinOutlined />}
        </IconButton>
      </Box>
      <Box sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Chip label="T28000 lunge" variant="outlined" color="primary" sx={{border: 2, fontSize: 14}}/>
        <Chip label="P11030 kilereseksjon" variant="outlined" color="secondary" sx={{border: 2, fontSize: 14}}/>
      </Box>
    </>
  );
};
export default Header;
