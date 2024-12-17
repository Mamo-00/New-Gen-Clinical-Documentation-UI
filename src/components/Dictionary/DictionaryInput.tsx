import React, { useState } from "react";
import { Box, Button, TextField, List, ListItem, IconButton, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

interface DictionaryInputProps {
  personalDictionary: string[];
  onAddTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
}

const DictionaryInput: React.FC<DictionaryInputProps> = ({
  personalDictionary,
  onAddTerm,
  onRemoveTerm,
}) => {
  const [newTerm, setNewTerm] = useState("");

  const handleAdd = () => {
    if (newTerm.trim()) {
      onAddTerm(newTerm.trim());
      setNewTerm("");
    }
  };

  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h6">Personal Dictionary</Typography>
      <TextField
        label="Add New Term"
        value={newTerm}
        onChange={(e) => setNewTerm(e.target.value)}
        fullWidth
        sx={{ marginBottom: 2 }}
      />
      <Button variant="contained" onClick={handleAdd} sx={{ marginBottom: 2 }}>
        Add Term
      </Button>
      <List>
        {personalDictionary.map((term, index) => (
          <ListItem
            key={index}
            secondaryAction={
              <IconButton edge="end" onClick={() => onRemoveTerm(term)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            {term}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default DictionaryInput;
