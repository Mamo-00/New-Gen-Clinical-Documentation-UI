import React, { useState } from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import TemplateTextArea from './TemplateTextArea';

/**
 * A demo page that shows the TemplateTextArea in action
 */
const TemplateMenuDemo: React.FC = () => {
  const [text, setText] = useState('');

  const handleChange = (newValue: string) => {
    setText(newValue);
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Template Menu Demo
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          Type <strong>template:</strong> in the text area below to see a context menu with available templates.
          You can also type <strong>template:category</strong> to filter by template category.
        </Typography>
        
        <TemplateTextArea 
          value={text}
          onChange={handleChange}
          label="Editor with Template Support"
          placeholder="Type 'template:' to see available templates..."
          minRows={8}
        />
      </Paper>
      
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Current Text Content:
        </Typography>
        <Box 
          component="pre" 
          sx={{ 
            p: 2, 
            backgroundColor: '#f5f5f5', 
            borderRadius: 1,
            maxHeight: '200px',
            overflow: 'auto',
            fontSize: '0.9rem',
            fontFamily: 'monospace'
          }}
        >
          {text || '(Empty)'}
        </Box>
      </Paper>
    </Container>
  );
};

export default TemplateMenuDemo; 