import React, { useEffect } from "react";
import { TextField, Box } from "@mui/material";
import Header from "../Header";
import EditorFooter from "../EditorFooter";
import EditorControls from "../Settings/EditorControls";
import { useEditor } from "../../context/EditorContext";

const Editor: React.FC = () => {
  const {
    content,
    setContent,
    wordCount,
    setWordCount,
    lastSaved,
    spellCheckEnabled,
    editorRef,
  } = useEditor();

  useEffect(() => {
    setWordCount(content.split(/\s+/).filter(Boolean).length);
  }, [content]);

  /* useEffect(() => {
    const fetchUserDictionary = async () => {
      const userId = "exampleUserId"; // Replace with actual user ID
      const userDictionary = await getFirestoreUserDictionary(userId);
      setCustomDictionary(userDictionary);
    };

    fetchUserDictionary();
  }, []); */

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        mx: "auto",
        p: 1,
        my: 1,
        backgroundColor: "background.paper",
      }}
    >
      <Header />
      <EditorControls />
      <TextField
        inputRef={editorRef}
        sx={{
          flex: 1, // Take remaining space
          minHeight: 0, // Allow shrinking
          "& .MuiInputBase-root": {
            height: "100%",
          },
          "& .MuiInputBase-input": {
            height: "100% !important",
            overflow: "auto",
          },
          mb: 4,
          border: 1,
          borderRadius: 1,
        }}
        value={content}
        onChange={handleContentChange}
        spellCheck={spellCheckEnabled}
        multiline
        rows={12}
        variant="outlined"
        fullWidth
      />

      <EditorFooter wordCount={wordCount} lastSaved={lastSaved} />
    </Box>
  );
};

export default Editor;
