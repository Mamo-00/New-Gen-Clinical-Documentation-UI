// src/components/TemplateManager.tsx
import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useEditor } from "../../context/EditorContext";
import { addTemplate, selectUser } from "../../features/userSlice";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
} from "@mui/material";
import { TextSnippetOutlined } from "@mui/icons-material";

interface TemplateManagerProps {
  showButtonText: boolean;
}

const TemplateManager: React.FC<TemplateManagerProps> = ({ showButtonText }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const templates = user?.templates || [];
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "" });
  const { editorRef } = useEditor();

  const handleAddTemplate = () => {
    if (newTemplate.name && newTemplate.content && user) {
      dispatch(addTemplate({ uid: user.uid, template: newTemplate }));
      setNewTemplate({ name: "", content: "" });
    }
  };

  const insertTemplate = (templateContent: string) => {
    const view = editorRef.current;
    if (view) {
      const selection = view.state.selection.ranges[0];
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: templateContent
        },
        selection: {
          anchor: selection.from + templateContent.length
        }
      });
      view.focus();
    }
  };
  
  return (
    <Box>
      <Button
        onClick={() => setShowTemplates(true)}
        variant="outlined"
        startIcon={<TextSnippetOutlined />}
        size="small"
        sx={{
          minWidth: showButtonText ? "auto" : "40px",
          "& .MuiButton-startIcon": {
            mr: showButtonText ? 1 : 0,
          },
        }}
      >
        {showButtonText ? "Maler" : ""}
      </Button>
      <Dialog open={showTemplates} onClose={() => setShowTemplates(false)}>
        <DialogTitle>Organiser Maler</DialogTitle>
        <DialogContent>
          <TextField
            label="Navn på mal"
            value={newTemplate.name}
            onChange={(e) =>
              setNewTemplate({ ...newTemplate, name: e.target.value })
            }
            fullWidth
            sx={{ my: 1 }}
          />
          <TextField
            label="Innhold"
            value={newTemplate.content}
            onChange={(e) =>
              setNewTemplate({ ...newTemplate, content: e.target.value })
            }
            fullWidth
            multiline
            rows={4}
            sx={{ my: 1 }}
          />
          <Button onClick={handleAddTemplate} variant="outlined">
            Legg til mal
          </Button>
          <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
            {templates.map((template, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography variant="body1">{template.name}</Typography>
                <Button
                  onClick={() => insertTemplate(template.content)}
                  size="medium"
                  variant="outlined"
                >
                  Sett in
                </Button>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplates(false)} variant="outlined">
            Lukk
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TemplateManager;
