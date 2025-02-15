import { EditorView } from '@codemirror/view';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

type Dimensions = {
  width: number;
  height: number;
};

interface EditorContextType {
  editorRef: React.RefObject<EditorView | null>;
  content: string;
  dimensions: Dimensions;
  setDimensions: (dimensions: Dimensions) => void;
  setContent: (content: string) => void;
  wordCount: number;
  setWordCount: (wordCount: number) => void;
  lastSaved: Date | null;
  setLastSaved: (lastSaved: Date | null) => void;
  pinned: boolean;
  spellCheckEnabled: boolean;
  setSpellCheckEnabled: (enabled: boolean) => void;
  autoCompleteEnabled: boolean;
  setAutoCompleteEnabled: (enabled: boolean) => void;
  handlePin: () => void;
  handleSave: () => void;
  handleUndo: () => void;
  handleResize: (event: any, { size }: any) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pinned, setPinned] = useState(false);
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(false);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);

  const editorRef = useRef<EditorView | null>(null);

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 600,
  });

  // Load saved content when component mounts
  useEffect(() => {
    const savedContent = localStorage.getItem('editorContent');
    const savedDate = localStorage.getItem('lastSaved');
    if (savedContent) {
      setContent(savedContent);
    }
    if (savedDate) {
      setLastSaved(new Date(savedDate));
    }

    // Also load saved dimensions if they exist
    const savedWidth = localStorage.getItem("editorWidth");
    const savedHeight = localStorage.getItem("editorHeight");
    if (savedWidth && savedHeight) {
      setDimensions({
        width: parseInt(savedWidth),
        height: parseInt(savedHeight),
      });
    }
  }, []); // Empty dependency array means this runs once on mount

  // Update word count when content changes
  React.useEffect(() => {
    setWordCount(content.split(/\s+/).filter(Boolean).length);
  }, [content]);

  const handlePin = () => {
    setPinned(!pinned);
    if (!pinned) {
      localStorage.setItem("editorWidth", dimensions.width.toString());
      localStorage.setItem("editorHeight", dimensions.height.toString());
    }
  };

  const handleResize = (_event: any, { size }: any) => {
    setDimensions({
      width: size.width,
      height: size.height,
    });
  };

  const handleSave = () => {
    setLastSaved(new Date());
    localStorage.setItem('editorContent', content);
    localStorage.setItem('lastSaved', new Date().toISOString());
  };

  const handleUndo = () => {
    // Implement undo logic
    // You might want to maintain an undo stack
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
      setSpellCheckEnabled,
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