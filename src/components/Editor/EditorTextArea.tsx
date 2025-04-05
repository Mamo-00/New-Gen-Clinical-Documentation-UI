import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Box, MenuItem, Menu } from "@mui/material";
import { useEditor } from "../../context/EditorContext";
import { EditorView } from "@codemirror/view";
import { useMedicalCompletions } from "../../utils/hooks/useMedicalCompletions";
import { useCodeMirrorConfig } from "../../utils/hooks/useCodeMirrorConfig";
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectUser, addCustomWord } from '../../features/userSlice';

interface EditorTextAreaProps {
  editorId: string;
}

const EditorTextArea: React.FC<EditorTextAreaProps> = ({ editorId }) => {
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    word: string;
    isCustomWord: boolean;
  } | null>(null);
  const {
    getContent,
    setContent: contextSetContent,
    autoCompleteEnabled,
    spellCheckEnabled,
    spellChecker,
  } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  // Get medical completions logic
  const { getCompletions } = useMedicalCompletions();

  const content = getContent(editorId);

  const setContent = useCallback(
    (newContent: string) => contextSetContent(editorId, newContent),
    [contextSetContent, editorId]
  );

  const editorRef = useRef<EditorView | null>(null);

  // Get CodeMirror configuration.
  const { createEditorState } = useCodeMirrorConfig({
    content,
    setContent,
    autoCompleteEnabled,
    spellCheckEnabled,
    getCompletions,
    spellChecker,
  });
  
   // Initialize CodeMirror and attach a context menu handler.
   useLayoutEffect(() => {
    if (!containerRef.current) return;
  
    const view = new EditorView({
      state: createEditorState(),
      parent: containerRef.current,
    });
  
    editorRef.current = view;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos !== null) {
        const wordRange = view.state.wordAt(pos);
        if (wordRange) {
          const word = view.state.sliceDoc(wordRange.from, wordRange.to);
            if (spellChecker && 
              (!spellChecker.checkWord(word) || spellChecker.isCustomWord(word))) {
            setContextMenu({
              mouseX: event.clientX,
              mouseY: event.clientY,
              word,
              isCustomWord: spellChecker.isCustomWord(word)
            });
          }
        }
      }
    };

    view.dom.addEventListener('contextmenu', handleContextMenu);
    return () => {
      view.dom.removeEventListener('contextmenu', handleContextMenu);
      view.destroy();
      editorRef.current = null;
    };
  }, [autoCompleteEnabled, spellCheckEnabled, spellChecker, createEditorState]);
;

   // Update the editor if external content changes.
   useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    // Update logic using localEditorRef
    const currentContent = view.state.doc.toString();
    if (currentContent !== content && !view.hasFocus) {
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });
    }
  }, [content]);

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleAddWord = () => {
    if (contextMenu && spellChecker) {
      spellChecker.addCustomWord(contextMenu.word);
      const reduxWord = contextMenu.word;
      if (user) {
        dispatch(addCustomWord({ uid: user?.uid, word: reduxWord }));
      }
    
      setContent(content); // A simple trick to force re‑evaluation.
      handleCloseContextMenu();
    }
  };

  const handleRemoveWord = () => {
    if (contextMenu && spellChecker) {
      spellChecker.removeCustomWord(contextMenu.word);
      // Force re-evaluation
      setContent(content);
      handleCloseContextMenu();
    }
  };

  return (
    <>
      <Box
        ref={containerRef}
        sx={{
          mb: 2,
          flex: 1,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          '& .cm-editor': {
            height: '100%',
            minHeight: '300px',
            padding: '8px'
          },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          p: 0,
          backgroundColor: 'background.paper',
          position: 'relative',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}20`,
          },
        }}
      />
      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined
        }
      >
        {contextMenu?.isCustomWord ? (
          <MenuItem onClick={handleRemoveWord}>
            Fjern &quot;{contextMenu?.word}&quot; fra ordlisten
          </MenuItem>
        ) : (
          <MenuItem onClick={handleAddWord}>
            Legg til &quot;{contextMenu?.word}&quot; i ordlisten
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default EditorTextArea;