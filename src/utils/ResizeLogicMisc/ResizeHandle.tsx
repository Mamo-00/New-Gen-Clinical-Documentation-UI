import React from 'react';
import { DragHandle } from '@mui/icons-material';
import { Box } from '@mui/material';

interface ResizeHandleProps {
  handleAxis?: string;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ handleAxis }) => {
  const rotation = {
    n: 0,
    s: 180,
    e: 90,
    w: 270,
    ne: 45,
    nw: 315,
    se: 135,
    sw: 225,
  }[handleAxis || ''] || 0;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'transparent',
        '&:hover': {
          color: 'primary.main'
        }
      }}
    >
      <DragHandle
        sx={{
          transform: `rotate(${rotation}deg)`,
          fontSize: '1.2rem'
        }}
      />
    </Box>
  );
};

export default ResizeHandle;