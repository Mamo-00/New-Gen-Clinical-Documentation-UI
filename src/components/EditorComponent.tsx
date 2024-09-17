// src/components/EditorComponent.tsx
import React, { useState, useEffect, useRef } from "react";
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import {
  Box,
  Toolbar,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from "@mui/material";
import {
  FormatSize,
  FormatAlignLeft,
  FormatAlignCenter,
  FormatAlignRight,
  FormatListBulleted,
  FormatListNumbered,
} from "@mui/icons-material";

import { mockMedicalTerms } from "../utils/mockMedicalConstants";
import { levenshteinEditDistance } from "levenshtein-edit-distance";

// Define the autocomplete and suggestions logic
monaco.languages.registerCompletionItemProvider("medical", {
  provideCompletionItems: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
  ) => {
    const currentWord = model.getValueInRange({
      startLineNumber: position.lineNumber,
      startColumn: position.column - (context.triggerCharacter?.length || 0),
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    });
    const suggestions = mockMedicalTerms.map((term) => ({
      label: term,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: term,
      range: {
        startLineNumber: position.lineNumber,
        startColumn: position.column - currentWord.length,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      },
      // Calculate Levenshtein distance for ranking
      score: levenshteinEditDistance(currentWord, term),
    }));
    // Sort suggestions based on their score (lower score means closer match)
    suggestions.sort((a, b) => a.score - b.score);
    // Limit the number of suggestions returned
    return { suggestions: suggestions.slice(0, 5) };
  },
});

// ... other code ...
interface Template {
  label: string;
  content: string;
}

const mockTemplates: Template[] = [
  {
    label: "Referral (X-ray)",
    content: "Referral letter for X-ray examination...",
  },
  {
    label: "Discharge Summary",
    content: "Discharge summary: The patient was...",
  },
  { label: "Consultation", content: "Consultation report for patient..." },
  // Add more templates as needed
];

const EditorComponent: React.FC = () => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [editor, setEditor] =
    useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {

    self.MonacoEnvironment = {
      getWorker(_, label) {
        if (label === 'json') {
          return new jsonWorker();
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
          return new cssWorker();
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
          return new htmlWorker();
        }
        if (label === 'typescript' || label === 'javascript') {
          return new tsWorker();
        }
        return new editorWorker();
      }
    };

    // Register a custom language for medical terms
    monaco.languages.register({ id: "medical" });

    // Define tokens and syntax highlighting rules for medical language
    monaco.languages.setMonarchTokensProvider("medical", {
      tokenizer: {
        root: [
          [
            /\b(x-ray|CT scan|MRI|blood test|referral|diagnosis|treatment)\b/,
            "custom-keyword",
          ],
        ],
      },
    });


    // Initialize Monaco Editor with medical language
    if (editorRef.current) {
      const monacoEditor = monaco.editor.create(editorRef.current, {
        value: "",
        language: "medical", // Use the custom medical language
        theme: "vs-light", // Light theme for minimalistic design
        minimap: { enabled: false },
        automaticLayout: true,
      });

      setEditor(monacoEditor);

      return () => {
        monacoEditor.dispose();
      };
    }
  }, []);

  // ... rest of the code ...

  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    const templateLabel = event.target.value;
    setSelectedTemplate(templateLabel);
    const selected = mockTemplates.find(
      (template) => template.label === templateLabel,
    );
    if (selected && editor) {
      editor.setValue(selected.content);
    }
  };

  // ... rest of the code ...

  const applyStyle = (style: string) => {
    if (editor) {
      const currentValue = editor.getValue();
      const updatedValue = `${style.toUpperCase()}(${currentValue})`;
      editor.setValue(updatedValue);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Rich Text Toolbar */}
      <Toolbar sx={{ backgroundColor: "primary.main" }}>
        <IconButton onClick={() => applyStyle("bold")}>
          <FormatSize />
        </IconButton>
        <IconButton onClick={() => applyStyle("italic")}>
          <FormatSize />
        </IconButton>
        <IconButton onClick={() => applyStyle("fontsize")}>
          <FormatSize />
        </IconButton>
        <IconButton onClick={() => applyStyle("left")}>
          <FormatAlignLeft />
        </IconButton>
        <IconButton onClick={() => applyStyle("center")}>
          <FormatAlignCenter />
        </IconButton>
        <IconButton onClick={() => applyStyle("right")}>
          <FormatAlignRight />
        </IconButton>
        <IconButton onClick={() => applyStyle("bulleted")}>
          <FormatListBulleted />
        </IconButton>
        <IconButton onClick={() => applyStyle("numbered")}>
          <FormatListNumbered />
        </IconButton>

        {/* Template Selector */}
        <FormControl variant="outlined" sx={{ marginLeft: 2, minWidth: 200 }}>
          <InputLabel>Insert Template</InputLabel>
          <Select
            value={selectedTemplate}
            onChange={handleTemplateChange}
            label="Insert Template"
          >
            {mockTemplates.map((template) => (
              <MenuItem key={template.label} value={template.label}>
                {template.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Toolbar>

      {/* Monaco Editor */}
      <Box sx={{ flexGrow: 1 }} ref={editorRef}></Box>
    </Box>
  );
};

export default EditorComponent;
