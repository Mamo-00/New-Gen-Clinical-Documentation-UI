import React, { useState, useEffect, useRef } from 'react';
import { Typography, List, ListItem, ListItemText, Popper, Paper, ClickAwayListener } from '@mui/material';
import { loadAllMacroTemplates, MacroTemplate } from '../../utils/templates/macroTemplateService';
import { EditorView } from '@codemirror/view';

interface TemplateMenuProps {
  onSelectTemplate: (template: MacroTemplate, replaceText?: string) => void;
  textAreaRef: React.RefObject<HTMLTextAreaElement | HTMLDivElement | null>;
  isCodeMirror?: boolean;
  editorView?: EditorView | null;
}

/**
 * A template menu component that shows a popup with template options
 * when the user types "template:" in a textarea or CodeMirror editor
 */
const TemplateMenu: React.FC<TemplateMenuProps> = ({ 
  onSelectTemplate, 
  textAreaRef, 
  isCodeMirror = false,
  editorView = null
}) => {
  const [templates, setTemplates] = useState<MacroTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<MacroTemplate[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterText, setFilterText] = useState('');
  const [_triggerPosition, setTriggerPosition] = useState<number>(-1);
  const [_cursorPosition, setCursorPosition] = useState<number>(-1);
  const popperRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ignoreCheckRef = useRef(false);
  const lastCloseTimeRef = useRef(0);

  // Load all available templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const allTemplates = await loadAllMacroTemplates();
        setTemplates(allTemplates);
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    
    loadTemplates();
  }, []);

  // Helper to check if the input contains "template:" at cursor position
  const checkForTemplateTag = () => {
    if (!textAreaRef.current) return false;
    
    // Check if we should ignore this check (prevent reopening right after closing)
    if (ignoreCheckRef.current) return false;
    
    // Don't reopen the menu if it was closed within the last 500ms
    const currentTime = Date.now();
    if (currentTime - lastCloseTimeRef.current < 500) {
      return false;
    }
    
    let text = '';
    let cursorPos = 0;
    
    if (isCodeMirror && editorView) {
      // For CodeMirror
      text = editorView.state.doc.toString();
      cursorPos = editorView.state.selection.main.head;
    } else if (!isCodeMirror && textAreaRef.current instanceof HTMLTextAreaElement) {
      // For regular textarea
      const textarea = textAreaRef.current;
      text = textarea.value;
      cursorPos = textarea.selectionStart;
    } else {
      return false;
    }
    
    // Check for "template:" before the cursor
    const textBeforeCursor = text.substring(0, cursorPos);
    
    // Match "template:" and optional text after it until cursor
    const match = textBeforeCursor.match(/template:([^\s]*)$/);
    
    if (match) {
      const trigger = textBeforeCursor.lastIndexOf('template:');
      const filterPart = match[1] || '';
      
      // Store positions and filter text
      setTriggerPosition(trigger);
      setCursorPosition(cursorPos);
      setFilterText(filterPart);
      
      // Calculate position for the popup
      let top = 0;
      let left = 0;
      
      if (isCodeMirror && editorView) {
        // For CodeMirror, get cursor coordinates
        const coords = editorView.coordsAtPos(cursorPos);
        if (coords) {
          top = coords.top;
          left = coords.left;
        }
      } else if (!isCodeMirror && textAreaRef.current instanceof HTMLTextAreaElement) {
        // For textarea, calculate position
        const textareaDimensions = textAreaRef.current.getBoundingClientRect();
        const lineHeight = parseInt(window.getComputedStyle(textAreaRef.current).lineHeight) || 20;
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines.length;
        top = textareaDimensions.top + (currentLine * lineHeight) - textAreaRef.current.scrollTop;
        left = textareaDimensions.left + 10;
      }
      
      // Create an invisible element at the cursor position to anchor the popper
      let cursorMarker = document.getElementById('template-cursor-marker');
      if (!cursorMarker) {
        cursorMarker = document.createElement('div');
        cursorMarker.id = 'template-cursor-marker';
        cursorMarker.style.position = 'absolute';
        cursorMarker.style.visibility = 'hidden';
        document.body.appendChild(cursorMarker);
      }
      
      // Position the marker at the cursor
      cursorMarker.style.top = `${top}px`;
      cursorMarker.style.left = `${left}px`;
      
      setAnchorEl(cursorMarker);
      return true;
    }
    
    return false;
  };

  // Update filtered templates when filter text changes
  useEffect(() => {
    if (!isOpen) return;
    
    const filtered = templates.filter(template => {
      const searchText = filterText.toLowerCase();
      return (
        template.name.toLowerCase().includes(searchText) ||
        template.category.toLowerCase().includes(searchText)
      );
    });
    
    setFilteredTemplates(filtered);
    setSelectedIndex(0); // Reset selection when filter changes
  }, [filterText, templates, isOpen]);

  // Add event listeners to the editor element
  useEffect(() => {
    const element = textAreaRef.current;
    if (!element) return;
    
    const handleInput = () => {
      const shouldShowMenu = checkForTemplateTag();
      setIsOpen(shouldShowMenu);
      
      if (!shouldShowMenu) {
        setAnchorEl(null);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredTemplates.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          if (filteredTemplates[selectedIndex]) {
            e.preventDefault();
            handleSelectTemplate(filteredTemplates[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };
    
    if (isCodeMirror && editorView) {
      // For CodeMirror, we need to manually trigger the check periodically
      // and handle keyboard events through CodeMirror's event system
      const interval = setInterval(handleInput, 1000);
      
      // We'll let CodeMirror handle the key events internally
      return () => {
        clearInterval(interval);
      };
    } else if (!isCodeMirror && element instanceof HTMLTextAreaElement) {
      // For regular textarea
      element.addEventListener('input', handleInput);
      element.addEventListener('keydown', handleKeyDown);
      element.addEventListener('click', handleInput);
      
      return () => {
        element.removeEventListener('input', handleInput);
        element.removeEventListener('keydown', handleKeyDown);
        element.removeEventListener('click', handleInput);
      };
    }
  }, [textAreaRef, isOpen, filteredTemplates, selectedIndex, isCodeMirror, editorView]);

  // Handle selecting a template
  const handleSelectTemplate = (template: MacroTemplate) => {
    // Get the text to replace ("template:xxx")
    const replaceText = `template:${filterText}`;
    
    // Call the callback with selected template and text to replace
    onSelectTemplate(template, replaceText);
    
    // Close the menu and prevent immediate reopening
    setIsOpen(false);
    ignoreCheckRef.current = true;
    lastCloseTimeRef.current = Date.now();
    
    // Reset ignore flag after a short delay
    setTimeout(() => {
      ignoreCheckRef.current = false;
    }, 500);
  };

  // Handle clicking away from the menu
  const handleClickAway = () => {
    setIsOpen(false);
    
    // Set a timestamp for when the menu was closed
    lastCloseTimeRef.current = Date.now();
  };

  // Render the component
  return (
    <div>
      {isOpen && (
        <ClickAwayListener onClickAway={handleClickAway}>
          <Popper
            open={isOpen}
            anchorEl={anchorEl}
            placement="bottom-start"
            style={{ zIndex: 1300, width: '300px', maxWidth: '90vw' }}
            ref={popperRef}
          >
            <Paper elevation={3} sx={{ mt: 1, p: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, px: 1 }}>
                {filteredTemplates.length > 0 
                  ? `Select a template (${filteredTemplates.length})` 
                  : 'No matching templates'}
              </Typography>
              
              {filteredTemplates.length > 0 && (
                <List dense sx={{ maxHeight: '300px', overflow: 'auto' }}>
                  {filteredTemplates.map((template, index) => (
                    <ListItem 
                      key={`${template.category}-${template.name}`}
                      onClick={() => handleSelectTemplate(template)}
                      sx={{
                        borderRadius: '4px',
                        backgroundColor: index === selectedIndex ? 'rgba(25, 118, 210, 0.12)' : 'transparent',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                          cursor: 'pointer'
                        }
                      }}
                    >
                      <ListItemText 
                        primary={template.name} 
                        secondary={template.category}
                        slotProps={{ primary: { fontWeight: index === selectedIndex ? 500 : 400 } }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Popper>
        </ClickAwayListener>
      )}
    </div>
  );
};

export default TemplateMenu; 