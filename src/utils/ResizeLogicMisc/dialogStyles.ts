import { Theme } from '@mui/material';

export const getDialogStyles = (theme: Theme, width: number, height: number) => ({
  paper: {
    sx: {
      width: width,
      height: height,
      maxWidth: "none",
      maxHeight: "none",
      m: 0,
      overflow: "visible", // Changed from "hidden" to allow handles to be visible
      cursor: 'default',
      position: 'relative', // Ensure proper stacking context
      zIndex: 1, // Ensure dialog is above backdrop
      '& .react-resizable-handle': {
        position: 'absolute',
        width: '20px',
        height: '20px',
        background: 'transparent',
        zIndex: 2, // Ensure handles are above dialog content
      },
      '& .react-resizable-handle-n': {
        top: '-3px',
        left: '50%',
        transform: 'translateX(-50%)',
        cursor: 'n-resize',
        width: '100%',
        height: '6px',
      },
      '& .react-resizable-handle-s': {
        bottom: '-3px',
        left: '50%',
        transform: 'translateX(-50%)',
        cursor: 's-resize',
        width: '100%',
        height: '6px',
      },
      '& .react-resizable-handle-e': {
        right: '-3px',
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: 'e-resize',
        width: '6px',
        height: '100%',
      },
      '& .react-resizable-handle-w': {
        left: '-3px',
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: 'w-resize',
        width: '6px',
        height: '100%',
      },
      '& .react-resizable-handle-ne': {
        right: '-6px',
        top: '-6px',
        cursor: 'ne-resize',
      },
      '& .react-resizable-handle-nw': {
        left: '-6px',
        top: '-6px',
        cursor: 'nw-resize',
      },
      '& .react-resizable-handle-se': {
        right: '-6px',
        bottom: '-6px',
        cursor: 'se-resize',
      },
      '& .react-resizable-handle-sw': {
        left: '-6px',
        bottom: '-6px',
        cursor: 'sw-resize',
      },
    }
  },
  backdrop: {
    sx: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    }
  }
});