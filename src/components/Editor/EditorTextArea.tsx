import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import { Box, MenuItem, Menu } from "@mui/material";
import { useEditor } from "../../context/EditorContext";
import { EditorView } from "@codemirror/view";
import { useMedicalCompletions } from "../../utils/hooks/useMedicalCompletions";
import { useCodeMirrorConfig } from "../../utils/hooks/useCodeMirrorConfig";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { selectUser, addCustomWord } from "../../features/userSlice";
import TemplateMenu from "../TemplateMenu/TemplateMenu";
import { MacroTemplate } from "../../utils/templates/macroTemplateService";
import { useTemplate } from "../../context/TemplateContext";
import { Compartment } from "@codemirror/state";

interface EditorTextAreaProps {
  editorId: string;
}

const dynamicExtensionsCompartment = new Compartment();
/**
 * EditorTextArea component that integrates CodeMirror with the template menu.
 *
 * This component handles:
 * 1. Rendering a CodeMirror editor
 * 2. Integration with the template menu system
 * 3. Spell checking and custom word management
 *
 * The template integration works by:
 * - Using a specialized version of TemplateMenu that supports CodeMirror
 * - Providing a custom handler to insert templates at the current cursor position
 * - Passing the editor view to the template menu so it can detect template triggers
 */
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

  // Get medical completions and template selection handler
  const { getCompletions } = useMedicalCompletions();

  // Add the useTemplate hook to get access to setSelectedTemplate
  const { setSelectedTemplate } = useTemplate();

  // Store initial content in a ref to avoid recreating the editor
  const initialContent = useRef(getContent(editorId));
  const content = getContent(editorId);

  // Ref to track if the editor has been initialized
  const editorInitializedRef = useRef(false);
  // Refs to store values that shouldn't trigger rerenders
  const contentRef = useRef(content);

  // Handle template selection - this is called when a template is selected from the menu
  const handleTemplateMenuSelection = (
    template: MacroTemplate,
    replaceText?: string
  ) => {
    const view = editorRef.current;
    if (!view || !replaceText) return;

    // Get the current document content
    const text = view.state.doc.toString();
    const cursorPos = view.state.selection.main.head;

    // Find the position of the text to replace
    const textBeforeCursor = text.substring(0, cursorPos);
    const triggerPosition = textBeforeCursor.lastIndexOf(
      replaceText.split(":")[0] + ":"
    );

    // Validate positions are within document bounds before making changes
    if (
      triggerPosition >= 0 &&
      triggerPosition < text.length &&
      cursorPos <= text.length
    ) {
      try {
        // Create a CodeMirror transaction to replace the text
        view.dispatch({
          changes: {
            from: triggerPosition,
            to: cursorPos,
            insert: template.templateText,
          },
          selection: {
            anchor: Math.min(
              triggerPosition + template.templateText.length,
              view.state.doc.length
            ),
          },
        });

        // Also update the template context to trigger the DynamicTree component
        // We use setSelectedTemplate directly
        setSelectedTemplate({
          text: template.templateText,
          originalText: template.templateText,
          category: template.category,
          timestamp: Date.now(),
        });

        // Focus the editor
        view.focus();
      } catch (error) {
        console.error("Error applying template:", error);
      }
    }
  };

  // Memoize setContent to prevent unnecessary re-renders
  const setContent = useCallback(
    (newContent: string) => {
      // Only update content if changed to avoid unnecessary re-rendering
      if (newContent !== contentRef.current) {
        contentRef.current = newContent;
        contextSetContent(editorId, newContent);
      }
    },
    [contextSetContent, editorId]
  );

  const editorRef = useRef<EditorView | null>(null);

  // Get CodeMirror configuration with initial content
  const { createEditorState, extensions } = useCodeMirrorConfig({
    content: initialContent.current,
    setContent,
    autoCompleteEnabled,
    spellCheckEnabled,
    getCompletions,
    spellChecker,
    editorId,
    handleTemplateSelection: handleTemplateMenuSelection,
    setSelectedTemplate, // Pass this to enable direct template context updates
  });

  // Initialize CodeMirror and attach event handlers - this should only run ONCE
  useLayoutEffect(() => {
    if (!containerRef.current || editorInitializedRef.current) return;

    const view = new EditorView({
      state: createEditorState([
        dynamicExtensionsCompartment.of(extensions)
      ]),
      parent: containerRef.current,
    });

    editorRef.current = view;
    editorInitializedRef.current = true;

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos !== null) {
        const wordRange = view.state.wordAt(pos);
        if (wordRange) {
          const word = view.state.sliceDoc(wordRange.from, wordRange.to);
          if (
            spellChecker &&
            (!spellChecker.checkWord(word) || spellChecker.isCustomWord(word))
          ) {
            setContextMenu({
              mouseX: event.clientX,
              mouseY: event.clientY,
              word,
              isCustomWord: spellChecker.isCustomWord(word),
            });
          }
        }
      }
    };

    // Add paste event handler to format pasted content
    const handlePaste = (event: ClipboardEvent) => {
      // Let the default handler work if no text is being pasted
      const pastedText = event.clipboardData?.getData('text');
      if (!pastedText || !spellCheckEnabled) return;

      // Prevent the default paste behavior
      event.preventDefault();

      // Apply advanced formatting rules to the pasted text
      let formatted = pastedText;
      
      // 1. Fix multiple consecutive spaces
      formatted = formatted.replace(/[ ]{2,}/g, ' ');
      
      // 2. Fix spacing after punctuation
      formatted = formatted.replace(/([.,:;!?])([^\s])/g, '$1 $2');
      
      // 3. Fix multiple empty lines
      formatted = formatted.replace(/\n{3,}/g, '\n\n');
      
      // 4. Properly handle paragraphs and word wrapping
      const MAX_LINE_LENGTH = 85;
      
      // First split into paragraphs to preserve paragraph structure
      const paragraphs = formatted.split(/\n\s*\n/);
      const formattedParagraphs = paragraphs.map(paragraph => {
        // Identify if this is a numbered section (e.g., "#1:", "#2:")
        const isNumberedSection = /^#\d+:/.test(paragraph);
        let prefix = '';
        
        // If it's a numbered section, preserve the section marker
        if (isNumberedSection) {
          const match = paragraph.match(/^(#\d+:)\s*/);
          if (match) {
            prefix = match[1] + ' ';
            paragraph = paragraph.substring(match[0].length);
          }
        }
        
        // Now format the paragraph content
        // Replace existing newlines with spaces to reflow the text
        const normalizedText = paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (normalizedText.length <= MAX_LINE_LENGTH && !isNumberedSection) {
          return normalizedText;
        }
        
        // Break into words and rebuild with proper wrapping
        const words = normalizedText.split(' ');
        const lines = [];
        let currentLine = isNumberedSection ? prefix : '';
        
        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          
          // Check if adding this word would exceed the line length
          if (currentLine.length + word.length + 1 > MAX_LINE_LENGTH && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = '';
          }
          
          // Add word to current line
          if (currentLine.length === 0) {
            currentLine = word;
          } else {
            currentLine += ' ' + word;
          }
          
          // Handle special cases for medical terminology
          if (i < words.length - 1) {
            const nextWord = words[i+1];
            
            // If keeping them together would exceed line length, start a new line now
            if (currentLine.length + nextWord.length + 1 > MAX_LINE_LENGTH) {
              lines.push(currentLine);
              currentLine = '';
            }
          }
        }
        
        // Add the last line if there's anything left
        if (currentLine.length > 0) {
          lines.push(currentLine);
        }
        
        return lines.join('\n');
      });
      
      formatted = formattedParagraphs.join('\n\n');
      
      // Get cursor position
      const selection = view.state.selection.main;
      
      // Insert the formatted text at cursor position
      view.dispatch({
        changes: {
          from: selection.from,
          to: selection.to,
          insert: formatted
        },
        selection: { anchor: selection.from + formatted.length }
      });
    };

    view.dom.addEventListener("contextmenu", handleContextMenu);
    view.dom.addEventListener("paste", handlePaste);

    return () => {
      view.dom.removeEventListener("contextmenu", handleContextMenu);
      view.dom.removeEventListener("paste", handlePaste);
      view.destroy();
      editorRef.current = null;
      editorInitializedRef.current = false;
    };
    // CRITICAL: Only include editorId to prevent recreation on every render
  }, [editorId]);

  // Update the editor if external content changes but only if not focused
  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;

    // Update our ref value
    contentRef.current = content;

    const currentContent = view.state.doc.toString();

    if (currentContent !== content && !view.hasFocus) {
      // Use a transaction to update content to avoid losing focus
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: content,
        },
      });

      // Ensure editor has focus after content update if it was focused before
      if (document.activeElement === view.dom) {
        view.focus();
      }
    }
  }, [content, editorId]);

  useEffect(() => {
    const view = editorRef.current;
    if (!view) return;
    view.dispatch({
      effects: dynamicExtensionsCompartment.reconfigure(extensions),
    });
  }, [extensions]);

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

      // Force re-evaluation of content without changing it
      const view = editorRef.current;
      if (view) {
        // Create an empty transaction to trigger linter refresh
        view.dispatch(view.state.update({}));
      }

      handleCloseContextMenu();
    }
  };

  const handleRemoveWord = () => {
    if (contextMenu && spellChecker) {
      spellChecker.removeCustomWord(contextMenu.word);

      // Force re-evaluation of content without changing it
      const view = editorRef.current;
      if (view) {
        // Create an empty transaction to trigger linter refresh
        view.dispatch(view.state.update({}));
      }

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
          overflow: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          "& .cm-editor": {
            height: "100%",
            minHeight: "300px",
            padding: "8px",
          },
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 0,
          backgroundColor: "background.paper",
          position: "relative",
          "&:focus-within": {
            borderColor: "primary.main",
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.main}20`,
          },
        }}
      />
      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
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
      <TemplateMenu
        onSelectTemplate={handleTemplateMenuSelection}
        textAreaRef={containerRef}
        isCodeMirror={true}
        editorView={editorRef.current}
      />
    </>
  );
};

export default EditorTextArea;
