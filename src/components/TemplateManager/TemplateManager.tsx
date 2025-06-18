// src/components/TemplateManager.tsx
import React, { useState, useEffect } from "react";
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
  Autocomplete,
} from "@mui/material";
import { TextSnippetOutlined } from "@mui/icons-material";
import { templates as availableTemplates, TemplateInfo } from "../../utils/templates/templateManifest";
import { useTemplate, TemplateData } from "../../context/TemplateContext";
import TreePagination from "../Trees/Pagination/TreePagination";

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

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stdPage, setStdPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 5;

  // Reset page to 1 when filters/search change
  useEffect(() => { setStdPage(1); }, [searchTerm, categoryFilter]);
  useEffect(() => { setUserPage(1); }, [searchTerm]);

  // Extract unique categories from availableTemplates
  const categories = Array.from(new Set(availableTemplates.map(t => t.category))).filter(Boolean);

  // Filter logic for standard templates
  const filteredTemplates = availableTemplates.filter((temp) => {
    const matchesCategory = !categoryFilter || temp.category === categoryFilter;
    const matchesSearch = !searchTerm || temp.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filter logic for user templates (optional: only by search)
  const filteredUserTemplates = userTemplates.filter((temp) => {
    const matchesSearch = !searchTerm || temp.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const stdStartIdx = (stdPage - 1) * itemsPerPage;
  const stdEndIdx = stdStartIdx + itemsPerPage;
  const pagedStdTemplates = filteredTemplates.slice(stdStartIdx, stdEndIdx);

  const userStartIdx = (userPage - 1) * itemsPerPage;
  const userEndIdx = userStartIdx + itemsPerPage;
  const pagedUserTemplates = filteredUserTemplates.slice(userStartIdx, userEndIdx);

  const hasActiveFilters = !!searchTerm || !!categoryFilter;
  const clearFilters = () => { setSearchTerm(""); setCategoryFilter(""); };

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
          {/* Search and filter controls */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <Autocomplete
              freeSolo
              options={availableTemplates.map(t => t.name)}
              inputValue={searchTerm}
              onInputChange={(_, value) => setSearchTerm(value)}
              renderInput={(params) => (
                <TextField {...params} label="Søk malnavn" variant="outlined" size="small" />
              )}
              sx={{ minWidth: 200, flex: 1 }}
            />
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel id="category-filter-label">Kategori</InputLabel>
              <Select
                labelId="category-filter-label"
                value={categoryFilter}
                label="Kategori"
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="">Alle</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outlined" color="secondary" size="small">Fjern filter</Button>
            )}
          </Box>
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
          <Box sx={{ maxHeight: "400px", overflowY: "auto", mt: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Standard Maler:
            </Typography>
            {pagedStdTemplates.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ingen maler funnet. {hasActiveFilters && (
                  <Button onClick={clearFilters} size="small" color="secondary">Fjern filter</Button>
                )}
              </Typography>
            ) : (
              pagedStdTemplates.map((temp, index) => (
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
              ))
            )}
            <TreePagination
              totalItems={filteredTemplates.length}
              currentPage={stdPage}
              setCurrentPage={setStdPage}
              itemsPerPage={itemsPerPage}
              itemLabel="mal"
              position="bottom"
              displayInfo={{
                start: filteredTemplates.length === 0 ? 0 : stdStartIdx + 1,
                end: Math.min(stdEndIdx, filteredTemplates.length),
                total: filteredTemplates.length,
              }}
            />
            {pagedUserTemplates.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                  Egne Maler:
                </Typography>
                {pagedUserTemplates.map((template, index) => (
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
                <TreePagination
                  totalItems={filteredUserTemplates.length}
                  currentPage={userPage}
                  setCurrentPage={setUserPage}
                  itemsPerPage={itemsPerPage}
                  itemLabel="mal"
                  position="bottom"
                  displayInfo={{
                    start: filteredUserTemplates.length === 0 ? 0 : userStartIdx + 1,
                    end: Math.min(userEndIdx, filteredUserTemplates.length),
                    total: filteredUserTemplates.length,
                  }}
                />
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
