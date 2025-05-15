import React, { useRef, useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import TemplateMenu from "./TemplateMenu";
import { MacroTemplate } from "../../utils/templates/macroTemplateService";

interface TemplateTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
}

/**
 * A text area component with template menu integration.
 * When the user types "template:", a menu will appear with available templates.
 */
const TemplateTextArea: React.FC<TemplateTextAreaProps> = ({
  value,
  onChange,
  label = "Content",
  placeholder = "Type template: to access templates",
  minRows = 4,
  maxRows = 10,
}) => {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [lastTemplateUsed, setLastTemplateUsed] = useState<string | null>(null);

  // Handle template selection
  const handleSelectTemplate = (template: MacroTemplate, replaceText?: string) => {
    if (!textAreaRef.current) return;
    
    const textarea = textAreaRef.current;
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    if (replaceText) {
      // Find the position of the text to replace
      const textBeforeCursor = text.substring(0, cursorPos);
      const triggerPosition = textBeforeCursor.lastIndexOf(replaceText.split(':')[0] + ':');
      
      if (triggerPosition >= 0) {
        // Replace "template:xxxx" with the template content
        const newText = text.substring(0, triggerPosition) + template.templateText + text.substring(cursorPos);
        
        // Update the parent component with the new value
        onChange(newText);
        
        // Set cursor position after the inserted template when the component re-renders
        setTimeout(() => {
          if (textAreaRef.current) {
            const newCursorPos = triggerPosition + template.templateText.length;
            textAreaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            textAreaRef.current.focus();
          }
        }, 0);
      }
    }

    // Record the template that was used
    setLastTemplateUsed(`${template.category} / ${template.name}`);
  };

  return (
    <Box sx={{ position: "relative" }}>
      <TextField
        label={label}
        multiline
        fullWidth
        minRows={minRows}
        maxRows={maxRows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        inputRef={textAreaRef}
        slotProps={{
          input: {
            sx: {
              fontFamily: "monospace",
              fontSize: "0.9rem",
            },
          },
        }}
        variant="outlined"
      />

      {lastTemplateUsed && (
        <Typography
          variant="caption"
          color="primary"
          sx={{
            display: "block",
            mt: 0.5,
            opacity: 0.8,
            transition: "opacity 2s ease-out",
          }}
        >
          Template used: {lastTemplateUsed}
        </Typography>
      )}

      <TemplateMenu
        onSelectTemplate={handleSelectTemplate}
        textAreaRef={textAreaRef}
        isCodeMirror={false}
      />
    </Box>
  );
};

export default TemplateTextArea;
