import React, { useState } from "react";
import { Box, TextField } from "@mui/material";
import useDictionaryManager from "../Dictionary/DictionaryManager";
import SuggestionsDropdown from "./SuggestionsDropdown";

const Editor: React.FC = () => {
  const { getMergedDictionary } = useDictionaryManager();
  const [inputValue, setInputValue] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [isDropdownVisible, setDropdownVisible] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Get matching terms from the merged dictionary
    if (value) {
      const matches = getMergedDictionary().filter((term) =>
        term.toLowerCase().startsWith(value.toLowerCase())
      );
      setSuggestions(matches);

      // Show dropdown if there are matches
      setDropdownVisible(matches.length > 0);

      // Update dropdown position
      const rect = e.target.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    } else {
      setDropdownVisible(false);
    }
  };

  const handleSelect = (term: string) => {
    setInputValue(term); // Populate the input with the selected term
    setDropdownVisible(false); // Hide dropdown
  };

  return (
    <Box sx={{ padding: 2 }}>
      <TextField
        value={inputValue}
        onChange={handleInputChange}
        variant="outlined"
        placeholder="Type to search..."
        fullWidth
      />
      <SuggestionsDropdown
        suggestions={suggestions}
        onSelect={handleSelect}
        position={dropdownPosition}
        isVisible={isDropdownVisible}
      />
    </Box>
  );
};

export default Editor;
