import React, { useEffect, useRef } from "react";
import { Box, List, ListItem } from "@mui/material";

interface SuggestionsDropdownProps {
  suggestions: string[];
  onSelect: (term: string) => void;
  position: { top: number; left: number };
  isVisible: boolean;
}

const SuggestionsDropdown: React.FC<SuggestionsDropdownProps> = ({
  suggestions,
  onSelect,
  position,
  isVisible,
}) => {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = React.useState<number>(0);

  // Keyboard navigation logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible || suggestions.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % suggestions.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case "Enter":
          e.preventDefault();
          if (suggestions[activeIndex]) onSelect(suggestions[activeIndex]);
          break;
        case "Escape":
          e.preventDefault();
          setActiveIndex(0);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, suggestions, activeIndex, onSelect]);

  if (!isVisible || suggestions.length === 0) return null;

  return (
    <Box
      ref={dropdownRef}
      sx={{
        position: "absolute",
        top: position.top,
        left: position.left,
        backgroundColor: "white",
        border: "1px solid #ccc",
        borderRadius: "4px",
        boxShadow: 3,
        zIndex: 1000,
        width: "200px",
        maxHeight: "150px",
        overflowY: "auto",
      }}
    >
      <List>
        {suggestions.map((term, index) => (
          <ListItem
            key={index}
            sx={{
              padding: "8px",
              backgroundColor: activeIndex === index ? "#f0f0f0" : "white",
              cursor: "pointer",
              "&:hover": { backgroundColor: "#f0f0f0" },
            }}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(term)}
          >
            {term}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SuggestionsDropdown;
