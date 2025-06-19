// src/context/EditorContext.tsx
import { EditorView } from "@codemirror/view";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { SpellCheckerService } from "../services/SpellCheckerService";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { selectUser } from "../features/userSlice";
import {
  updateEditorDimensions,
  updateEditorPinned,
  updateEditorSpellCheckEnabled,
} from "../features/userSlice";

type Dimensions = {
  width: number;
  height: number;
};

// Define a type for individual editor state
interface EditorState {
  content: string;
  wordCount: number;
  lastSaved: Date | null;
  history: {
    past: string[];
    future: string[];
  };
}

interface EditorContextType {
  editorRef: React.MutableRefObject<EditorView | null>;
  dimensions: Dimensions;
  setDimensions: (dimensions: Dimensions) => void;
  // Change to support multiple editors
  getContent: (editorId: string) => string;
  setContent: (editorId: string, content: string) => void;
  getWordCount: (editorId: string) => number;
  setWordCount: (editorId: string, wordCount: number) => void;
  getLastSaved: (editorId: string) => Date | null;
  setLastSaved: (editorId: string, lastSaved: Date | null) => void;
  autoCompleteEnabled: boolean;
  setAutoCompleteEnabled: (enabled: boolean) => void;
  pinned: boolean;
  handlePin: () => void;
  handleSave: (editorId: string) => void;
  handleUndo: (editorId: string) => void;
  handleRedo: (editorId: string) => void;
  handleFormat: (editorId: string) => void;
  handleResize: (event: any, { size }: any) => void;
  spellCheckEnabled: boolean;
  setSpellCheckEnabled: (enabled: boolean) => void;
  spellChecker: SpellCheckerService | null;
  setSpellChecker: (sc: SpellCheckerService) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Replace single content with a map of editor contents
  const [editorStates, setEditorStates] = useState<Record<string, EditorState>>({});
  const [pinned, setPinned] = useState(false);
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  const [spellChecker, setSpellChecker] = useState<SpellCheckerService | null>(
    null
  );
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: 800,
    height: 600,
  });
  const editorRef = useRef<EditorView | null>(null);

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    async function loadSpellChecker() {
      const sc = await SpellCheckerService.create(
        "/dictionaries/nb_NO.aff",
        "/dictionaries/nb_NO.dic",
        "/dictionaries/nn_NO.aff",
        "/dictionaries/nn_NO.dic",
        user?.wordlist
      );
      setSpellChecker(sc);
    }
    loadSpellChecker();
  }, []);

  // Load saved content from localStorage for each editor
  useEffect(() => {
    // Load editor content for all known editors
    const editorIds = ["makroskopisk", "mikroskopisk", "konklusjon"]; // Default editor IDs
    
    const newEditorStates: Record<string, EditorState> = {};
    
    editorIds.forEach(id => {
      const savedContent = localStorage.getItem(`editorContent_${id}`);
      const savedDate = localStorage.getItem(`lastSaved_${id}`);
      
      newEditorStates[id] = {
        content: savedContent || "",
        wordCount: savedContent ? savedContent.split(/\s+/).filter(Boolean).length : 0,
        lastSaved: savedDate ? new Date(savedDate) : null,
        history: {
          past: [],
          future: []
        }
      };
    });
    
    setEditorStates(newEditorStates);
    
    const savedWidth = localStorage.getItem("editorWidth");
    const savedHeight = localStorage.getItem("editorHeight");
    if (savedWidth && savedHeight) {
      setDimensions({
        width: parseInt(savedWidth),
        height: parseInt(savedHeight),
      });
    }
  }, []);

  // Getter and setter methods for individual editor states
  const getContent = useCallback((editorId: string) => {
    return editorStates[editorId]?.content || "";
  }, [editorStates]);

  const setContent = useCallback((editorId: string, content: string) => {
    setEditorStates(prev => {
      const currentState = prev[editorId] || { content: "", wordCount: 0, lastSaved: null, history: { past: [], future: [] } };
      
      // Only add to history if content actually changed
      if (content !== currentState.content) {
        return {
          ...prev,
          [editorId]: {
            content,
            wordCount: content.split(/\s+/).filter(Boolean).length,
            lastSaved: currentState.lastSaved,
            history: {
              past: [...currentState.history.past, currentState.content],
              future: [] // Clear future history when new content is added
            }
          }
        };
      }
      return prev;
    });
  }, []);

  const getWordCount = useCallback((editorId: string) => {
    return editorStates[editorId]?.wordCount || 0;
  }, [editorStates]);

  const setWordCount = useCallback((editorId: string, wordCount: number) => {
    setEditorStates(prev => ({
      ...prev,
      [editorId]: {
        ...prev[editorId] || { content: "", lastSaved: null },
        wordCount
      }
    }));
  }, []);

  const getLastSaved = useCallback((editorId: string) => {
    return editorStates[editorId]?.lastSaved || null;
  }, [editorStates]);

  const setLastSaved = useCallback((editorId: string, lastSaved: Date | null) => {
    setEditorStates(prev => ({
      ...prev,
      [editorId]: {
        ...prev[editorId] || { content: "", wordCount: 0 },
        lastSaved
      }
    }));
  }, []);

  const handlePin = () => {
    const newPinned = !pinned;
    setPinned(newPinned);
    if (user) {
      dispatch(updateEditorPinned({ uid: user.uid, pinned: newPinned }));
    }
    if (!newPinned) {
      localStorage.setItem("editorWidth", dimensions.width.toString());
      localStorage.setItem("editorHeight", dimensions.height.toString());
    }
  };

  const handleResize = (_event: any, { size }: any) => {
    setDimensions({ width: size.width, height: size.height });
    if (user) {
      dispatch(
        updateEditorDimensions({
          uid: user.uid,
          dimensions: { width: size.width, height: size.height },
        })
      );
    }
  };

  const handleSave = useCallback((editorId: string) => {
    const now = new Date();
    setLastSaved(editorId, now);
    
    // Save to localStorage with the editor ID as part of the key
    const content = getContent(editorId);
    localStorage.setItem(`editorContent_${editorId}`, content);
    localStorage.setItem(`lastSaved_${editorId}`, now.toISOString());
  }, [getContent, setLastSaved]);

  const handleUndo = useCallback((editorId: string) => {
    setEditorStates(prev => {
      const currentState = prev[editorId];
      if (!currentState || currentState.history.past.length === 0) return prev;

      const previousContent = currentState.history.past[currentState.history.past.length - 1];
      const newPast = currentState.history.past.slice(0, -1);

      return {
        ...prev,
        [editorId]: {
          content: previousContent,
          wordCount: previousContent.split(/\s+/).filter(Boolean).length,
          lastSaved: currentState.lastSaved,
          history: {
            past: newPast,
            future: [currentState.content, ...currentState.history.future]
          }
        }
      };
    });
  }, []);

  const handleRedo = useCallback((editorId: string) => {
    setEditorStates(prev => {
      const currentState = prev[editorId];
      if (!currentState || currentState.history.future.length === 0) return prev;

      const nextContent = currentState.history.future[0];
      const newFuture = currentState.history.future.slice(1);

      return {
        ...prev,
        [editorId]: {
          content: nextContent,
          wordCount: nextContent.split(/\s+/).filter(Boolean).length,
          lastSaved: currentState.lastSaved,
          history: {
            past: [...currentState.history.past, currentState.content],
            future: newFuture
          }
        }
      };
    });
  }, []);

  const handleFormat = useCallback((editorId: string) => {
    setEditorStates(prev => {
      const currentState = prev[editorId];
      if (!currentState) return prev;

      // Get current content
      let content = currentState.content;
      
      // Apply formatting rules
      
      // 1. Fix multiple consecutive spaces
      content = content.replace(/[ ]{2,}/g, ' ');
      
      // 2. Fix spacing after punctuation
      content = content.replace(/([.,:;!?])([^\s])/g, '$1 $2');
      
      // 3. Fix multiple empty lines
      content = content.replace(/\n{3,}/g, '\n\n');
      
      // 4. Ensure proper line wrapping that respects word boundaries
      const MAX_LINE_LENGTH = 85;
      
      // Special handling for numbered sections like "#1:" and medical terms
      // First split into paragraphs to preserve paragraph structure
      const paragraphs = content.split(/\n\s*\n/);
      const formattedParagraphs = paragraphs.map(paragraph => {
        // Process each paragraph
        
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
        // First replace existing newlines with spaces to reflow the text
        const normalizedText = paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (normalizedText.length <= MAX_LINE_LENGTH && !isNumberedSection) {
          return normalizedText;
        }
        
        // Break into words and rebuild with proper wrapping
        const words = normalizedText.split(' ');
        const lines = [];
        let currentLine = isNumberedSection ? prefix : ''; // Start with the prefix if it's a numbered section
        
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
          // If the next word would make a medical term that shouldn't be split
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
      
      const formattedContent = formattedParagraphs.join('\n\n');
      
      // Update the editor view directly if it exists
      if (editorRef.current) {
        const view = editorRef.current;
        // Store current selection
        const selection = view.state.selection;
        
        // Update content with a transaction
        view.dispatch({
          changes: {
            from: 0,
            to: view.state.doc.length,
            insert: formattedContent
          },
          // Try to preserve selection
          selection: selection
        });
      }
      
      // Save history to enable undo
      return {
        ...prev,
        [editorId]: {
          content: formattedContent,
          wordCount: formattedContent.split(/\s+/).filter(Boolean).length,
          lastSaved: currentState.lastSaved,
          history: {
            past: [...currentState.history.past, currentState.content],
            future: []
          }
        }
      };
    });
  }, []);

  const setSpellCheckEnabledAndPersist = (enabled: boolean) => {
    setSpellCheckEnabled(enabled);
    if (user) {
      dispatch(updateEditorSpellCheckEnabled({ uid: user.uid, enabled }));
    }
  };

  return (
    <EditorContext.Provider
      value={{
        editorRef,
        dimensions,
        setDimensions,
        getContent,
        setContent,
        getWordCount,
        setWordCount,
        getLastSaved,
        setLastSaved,
        autoCompleteEnabled,
        setAutoCompleteEnabled,
        pinned,
        handlePin,
        handleSave,
        handleUndo,
        handleRedo,
        handleFormat,
        handleResize,
        spellCheckEnabled,
        setSpellCheckEnabled: setSpellCheckEnabledAndPersist,
        spellChecker,
        setSpellChecker,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  return context;
};