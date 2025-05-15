import React from "react";
import { Box, FormControlLabel, Switch, Button, Chip, Tooltip } from "@mui/material";
import { Logout } from "@mui/icons-material";
import { useEditor } from "../../context/EditorContext";
import { useContainerWidth } from "../../utils/hooks/useContainerWidth";
import TemplateManager from "../TemplateManager/TemplateManager";
import DictionaryInput from "../Dictionary/DictionaryInput";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logoutUser, selectUser } from "../../features/userSlice";
import { useNavigate } from "react-router-dom";

const EditorControls: React.FC = () => {
  const {
    autoCompleteEnabled,
    setAutoCompleteEnabled,
    spellCheckEnabled,
    setSpellCheckEnabled,
  } = useEditor();

  const { containerRef, showButtonText } = useContainerWidth(375);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector(selectUser);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        mb: 2,
      }}
    >
      {/* Buttons Container */}
      <Box
        ref={containerRef}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4,
          minHeight: 48,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
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
        
        {/* User info and logout */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {user && (
            <>
              <Chip 
                label={user.name || "Bruker"} 
                variant="outlined" 
                color="primary" 
                size="small"
              />
              <Tooltip title="Logg ut">
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  onClick={handleLogout}
                  startIcon={<Logout />}
                >
                  {showButtonText ? "Logg ut" : ""}
                </Button>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default EditorControls;
