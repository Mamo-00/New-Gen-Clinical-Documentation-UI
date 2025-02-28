// src/context/EditorContext.tsx
import { EditorView } from '@codemirror/view';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { SpellCheckerService } from '../services/SpellCheckerService';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { selectUser } from '../features/userSlice';
import { updateEditorDimensions, updateEditorPinned, updateEditorSpellCheckEnabled } from '../features/userSlice';

type Dimensions = {
  width: number;
  height: number;
};

interface EditorContextType {
  editorRef: React.MutableRefObject<EditorView | null>;
  dimensions: Dimensions;
  setDimensions: (dimensions: Dimensions) => void;
  content: string;
  setContent: (content: string) => void;
  wordCount: number;
  setWordCount: (wordCount: number) => void;
  lastSaved: Date | null;
  setLastSaved: (lastSaved: Date | null) => void;
  autoCompleteEnabled: boolean;
  setAutoCompleteEnabled: (enabled: boolean) => void;
  pinned: boolean;
  handlePin: () => void;
  handleSave: () => void;
  handleUndo: () => void;
  handleResize: (event: any, { size }: any) => void;
  spellCheckEnabled: boolean;
  setSpellCheckEnabled: (enabled: boolean) => void;
  spellChecker: SpellCheckerService | null;
  setSpellChecker: (sc: SpellCheckerService) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pinned, setPinned] = useState(false);
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  const [spellChecker, setSpellChecker] = useState<SpellCheckerService | null>(null);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 800, height: 600 });
  const editorRef = useRef<EditorView | null>(null);

  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  useEffect(() => {
    async function loadSpellChecker() {
      const sc = await SpellCheckerService.create(
        '/dictionaries/nb_NO.aff',
        '/dictionaries/nb_NO.dic',
        '/dictionaries/nn_NO.aff',
        '/dictionaries/nn_NO.dic',
        user?.wordlist
      );
      setSpellChecker(sc);
    }
    loadSpellChecker();
  }, []);

  // Load saved content and dimensions from localStorage
  useEffect(() => {
    const savedContent = localStorage.getItem('editorContent');
    const savedDate = localStorage.getItem('lastSaved');
    if (savedContent) setContent(savedContent);
    if (savedDate) setLastSaved(new Date(savedDate));
    const savedWidth = localStorage.getItem("editorWidth");
    const savedHeight = localStorage.getItem("editorHeight");
    if (savedWidth && savedHeight) {
      setDimensions({ width: parseInt(savedWidth), height: parseInt(savedHeight) });
    }
  }, []);

  // Update word count when content changes
  useEffect(() => {
    setWordCount(content.split(/\s+/).filter(Boolean).length);
  }, [content]);

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
      dispatch(updateEditorDimensions({ uid: user.uid, dimensions: { width: size.width, height: size.height } }));
    }
  };

  const handleSave = () => {
    setLastSaved(new Date());
    localStorage.setItem('editorContent', content);
    localStorage.setItem('lastSaved', new Date().toISOString());
  };

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
    <EditorContext.Provider value={{
      content,
      setContent,
      dimensions,
      setDimensions,
      wordCount,
      setWordCount,
      lastSaved,
      setLastSaved,
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
    }}>
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};
