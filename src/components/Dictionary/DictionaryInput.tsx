// src/components/DictionaryInput.tsx
import React, { useState } from "react";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
} from "@mui/material";
import { Add } from "@mui/icons-material";
import { useDictionaryManager } from "./useDictionaryManager";

interface DictionaryInputProps {
  showButtonText: boolean;
}

const DictionaryInput: React.FC<DictionaryInputProps> = ({ showButtonText }) => {
  const [showDictionary, setShowDictionary] = useState(false);
  const [newWord, setNewWord] = useState("");
  const { addToPersonalDictionary, personalDictionary } = useDictionaryManager();

  const addCustomWord = () => {
    if (newWord.trim() !== "") {
      addToPersonalDictionary(newWord.trim());
      setNewWord("");
    }
  };

  return (
    <Box>
      <Button
        onClick={() => setShowDictionary(true)}
        variant="outlined"
        startIcon={<Add />}
        size="small"
        sx={{
          minWidth: showButtonText ? "auto" : "40px",
          "& .MuiButton-startIcon": {
            mr: showButtonText ? 1 : 0,
            ml: showButtonText ? 0 : 0,
          },
        }}
      >
        {showButtonText ? "Legg til ordliste" : ""}
      </Button>
      <Dialog open={showDictionary} onClose={() => setShowDictionary(false)}>
        <DialogTitle>Legg til ordliste</DialogTitle>
        <DialogContent>
          <TextField
            label="Nytt ord"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
          <Button onClick={addCustomWord} variant="outlined" sx={{ my: 1 }}>
            Legg til
          </Button>
          <Box sx={{ maxHeight: "400px", overflowY: "auto", mt: 2 }}>
            {personalDictionary.map((word, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                {word}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDictionary(false)} variant="outlined">
            Lukk
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DictionaryInput;
