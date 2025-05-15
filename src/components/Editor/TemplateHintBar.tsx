import React, { useState } from 'react';
import { Box, Typography, Chip, Tooltip, IconButton, Collapse } from '@mui/material';
import { Info as InfoIcon, Close as CloseIcon } from '@mui/icons-material';
import { useMacroTemplateHint } from '../../utils/hooks/useMacroTemplateHint';

/**
 * A component that displays hints about using template snippets in the editor
 */
const TemplateHintBar: React.FC = () => {
  const { categories, isLoading, getTemplateHint, getTemplateExamples } = useMacroTemplateHint();
  const [open, setOpen] = useState(true);
  
  // Don't render anything if still loading or no categories are available
  if (isLoading || categories.length === 0) {
    return null;
  }
  
  const handleClose = () => {
    setOpen(false);
  };
  
  const examples = getTemplateExamples();
  
  return (
    <Collapse in={open}>
      <Box 
        sx={{ 
          p: 1, 
          mb: 2, 
          borderRadius: 1, 
          bgcolor: 'info.light', 
          color: 'info.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <InfoIcon sx={{ mr: 1 }} fontSize="small" />
          <Typography variant="body2" sx={{ mr: 2 }}>
            {getTemplateHint()}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {examples.map((example, i) => (
              <Tooltip 
                key={i} 
                title={`Type this in the editor for template suggestions`}
              >
                <Chip
                  label={example}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    bgcolor: 'background.paper',
                    borderColor: 'info.main',
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: 'background.default'
                    }
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
        
        <IconButton 
          size="small" 
          onClick={handleClose}
          sx={{ color: 'info.contrastText' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Collapse>
  );
};

export default TemplateHintBar; 