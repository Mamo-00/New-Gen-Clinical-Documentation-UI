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
  handleUndo: () => void;
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
        lastSaved: savedDate ? new Date(savedDate) : null
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
    setEditorStates(prev => ({
      ...prev,
      [editorId]: {
        ...prev[editorId] || { wordCount: 0, lastSaved: null },
        content,
        wordCount: content.split(/\s+/).filter(Boolean).length
      }
    }));
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

  const handleUndo = () => {
    // Implement undo logic (if needed)
  };

  const setSpellCheckEnabledAndPersist = (enabled: boolean) => {
    setSpellCheckEnabled(enabled);
    if (user) {
      dispatch(updateEditorSpellCheckEnabled({ uid: user.uid, enabled }));
    }
  };

  return (
    <EditorContext.Provider
      value={{
        getContent,
        setContent,
        getWordCount,
        setWordCount,
        getLastSaved,
        setLastSaved,
        dimensions,
        setDimensions,
        pinned,
        spellCheckEnabled,
        setSpellCheckEnabled: setSpellCheckEnabledAndPersist,
        spellChecker,
        setSpellChecker,
        autoCompleteEnabled,
        setAutoCompleteEnabled,
        handlePin,
        handleSave,
        handleUndo,
        handleResize,
        editorRef,
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