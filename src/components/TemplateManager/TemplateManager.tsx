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
  CircularProgress,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from "@mui/material";
import { TextSnippetOutlined } from "@mui/icons-material";
import { templates as availableTemplates, TemplateInfo } from "../../utils/templates/templateManifest";
import { useTemplate, TemplateData } from "../../context/TemplateContext";

const TemplateManager: React.FC<{ showButtonText: boolean }> = ({ showButtonText }) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const userTemplates = user?.templates || [];
  const { setContent: setEditorContent } = useEditor();
  const { setSelectedTemplate } = useTemplate();

  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: "", content: "" });
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New: Target editor selection (optional)
  const [targetEditorId, setTargetEditorId] = useState("makroskopisk");
  const availableEditorIds = ["makroskopisk", "mikroskopisk", "konklusjon"];

  const handleAddTemplate = () => {
    if (newTemplate.name && newTemplate.content && user) {
      dispatch(addTemplate({ uid: user.uid, template: newTemplate }));
      setNewTemplate({ name: "", content: "" });
    }
  };

  // Fetch a template text from its URL and then update the context with the text and category.
  const fetchAndSetTemplate = async (templateInfo: TemplateInfo) => {
    setLoadingTemplate(true);
    setError(null);
    try {
      const response = await fetch(templateInfo.url);
      if (!response.ok) {
        throw new Error("Failed to load template");
      }
      const content = await response.text();
      // Set both text and originalText
      const templateData: TemplateData = {
        text: content,
        originalText: content, // Set the original content
        category: templateInfo.category,
        timestamp: new Date().getTime(),
      };
      setSelectedTemplate(templateData);
      setEditorContent(targetEditorId, content);
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // Optionally, for user-created templates:
  const insertTemplateIntoEditor = (templateContent: string, category: string) => {
    setSelectedTemplate({ text: templateContent, category, originalText: templateContent, timestamp: new Date().getTime()});
    setEditorContent(targetEditorId, templateContent);
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
          "& .MuiButton-startIcon": { mr: showButtonText ? 1 : 0 },
        }}
      >
        {showButtonText ? "Maler" : ""}
      </Button>
      <Dialog open={showTemplates} onClose={() => setShowTemplates(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Organiser Maler</DialogTitle>
        <DialogContent>
          <TextField
            label="Navn på mal"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            fullWidth
            sx={{ my: 1 }}
          />
          <TextField
            label="Innhold"
            value={newTemplate.content}
            onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
            fullWidth
            multiline
            rows={4}
            sx={{ my: 1 }}
          />
          <Button onClick={handleAddTemplate} variant="outlined" sx={{ my: 1 }}>
            Legg til mal
          </Button>

          <FormControl fullWidth sx={{ my: 1 }}>
            <InputLabel id="target-editor-label">Velg Editor</InputLabel>
            <Select
              labelId="target-editor-label"
              value={targetEditorId}
              label="Velg Editor"
              onChange={(e) => setTargetEditorId(e.target.value)}
            >
              {availableEditorIds.map((editorId) => (
                <MenuItem key={editorId} value={editorId}>
                  {editorId}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ maxHeight: "300px", overflowY: "auto", mt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Standard Maler:
            </Typography>
            {availableTemplates.map((temp, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                  p: 1,
                  border: "1px solid #ccc",
                  borderRadius: 1,
                }}
              >
                <Typography variant="body1">
                  {temp.name} ({temp.category})
                </Typography>
                <Button onClick={() => fetchAndSetTemplate(temp)} size="small" variant="outlined">
                  Velg
                </Button>
              </Box>
            ))}
            {userTemplates.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Egne Maler:
                </Typography>
                {userTemplates.map((template, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                      p: 1,
                      border: "1px solid #ccc",
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="body1">{template.name}</Typography>
                    <Button
                      onClick={() => {
                        insertTemplateIntoEditor(template.content, "custom");
                      }}
                      size="small"
                      variant="outlined"
                    >
                      Velg
                    </Button>
                  </Box>
                ))}
              </>
            )}
            {loadingTemplate && <CircularProgress size={24} />}
            {error && <Typography color="error">{error}</Typography>}
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
