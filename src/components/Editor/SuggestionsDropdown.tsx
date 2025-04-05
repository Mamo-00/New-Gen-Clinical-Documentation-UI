import React, { useEffect, useRef } from "react";
import { Box, List, ListItem } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface SuggestionItem {
  label: string;
  value: string;
}

interface SuggestionsDropdownProps {
  suggestions: SuggestionItem[];
  onSelect: (term: SuggestionItem) => void;
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
  const theme = useTheme();

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
        top: "45%",
        left: "5%",
        backgroundColor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: "4px",
        boxShadow: theme.shadows[3],
        zIndex: 1000,
        width: "200px",
        maxHeight: "200px",
        overflowY: "auto",
      }}
    >
      <List>
        {suggestions.map((term, index) => (
          <ListItem
            key={term.value}
            sx={{
              padding: "8px",
              backgroundColor: activeIndex === index ? theme.palette.action.hover : "transparent",
              cursor: "pointer",
              "&:hover": { backgroundColor: theme.palette.action.hover },
            }}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => onSelect(term)}
          >
            {term.label}
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SuggestionsDropdown;