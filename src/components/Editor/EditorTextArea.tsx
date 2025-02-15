import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Box } from "@mui/material";
import { useEditor } from "../../context/EditorContext";
import { EditorView } from "@codemirror/view";
import { useMedicalCompletions } from '../../utils/hooks/useMedicalCompletions';
import { useCodeMirrorConfig } from '../../utils/hooks/useCodeMirrorConfig';

const EditorTextArea: React.FC = () => {
  const { content, setContent, autoCompleteEnabled, editorRef } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);

  // Get medical completions logic
  const { getCompletions } = useMedicalCompletions();

  // Get editor configuration
  const { createEditorState } = useCodeMirrorConfig({
    content,
    setContent,
    autoCompleteEnabled,
    getCompletions,
  });

  // Initialize editor
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const view = new EditorView({
      state: createEditorState(),
      parent: containerRef.current
    });

    // Store the EditorView instance in context ref
    (editorRef as React.MutableRefObject<EditorView | null>).current = view;

    return () => {
      view.destroy();
      (editorRef as React.MutableRefObject<EditorView | null>).current = null;
    };
  // Remove createEditorState from dependencies, only reinitialize on autoCompleteEnabled changes
  }, [autoCompleteEnabled]);

  // Modify the external content changes handler
  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    
    // Only update if the content is different and the change didn't come from the editor
    const currentContent = view.state.doc.toString();
    if (currentContent !== content && !view.hasFocus) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content
        }
      });
    }
  }, [content]);

  return (
    <Box
      ref={containerRef}
      sx={{
        mb: 2,
        flex: 1,
        overflow: "auto",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        "& .cm-editor": {
          // Additional MUI styling if needed
          height: "100%",
          minHeight: "300px", // Adjust as needed
        },
        // Container styling
        display: "flex",
        flexDirection: "column",
        gap: 2,
        p: 0,
        backgroundColor: "background.paper",
        position: "relative",
        // Focus state
        "&:focus-within": {
          borderColor: "primary.main",
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}20`,
        },
      }}
    />
  );
};

export default EditorTextArea;
