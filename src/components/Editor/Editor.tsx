import React, { useState } from "react";
import { Box, TextField } from "@mui/material";
import { useDictionaryManager } from "../Dictionary/useDictionaryManager";
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

  // Utility function to get the last word typed
  const getLastWord = (text: string): string => {
    const words = text.trim().split(" ");
    return words[words.length - 1]; // Return the last word
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Get the last word being typed
    const lastWord = getLastWord(value);

    if (lastWord.length >= 3) {
      // Get matching terms from the dictionary
      const matches = getMergedDictionary().filter((term) =>
        term.toLowerCase().startsWith(lastWord.toLowerCase())
      );

      setSuggestions(matches);

      // Show dropdown if there are matches
      setDropdownVisible(matches.length > 0);

      // Update dropdown position
      const rect = e.target.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
    } else {
      setDropdownVisible(false); // Hide dropdown if fewer than 3 characters
    }
  };

  const handleSelect = (term: string) => {
    // Replace the last word with the selected suggestion
    const words = inputValue.trim().split(" ");
    words[words.length - 1] = term; // Replace the last word
    setInputValue(words.join(" ") + " "); // Rebuild the input and add a space
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
