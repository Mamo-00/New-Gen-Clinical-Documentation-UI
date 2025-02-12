import React, { useState } from "react";
import Editor from "../Editor/Editor";
import ResizeHandle from "../../utils/ResizeLogicMisc/ResizeHandle";
import { getDialogStyles } from "../../utils/ResizeLogicMisc/dialogStyles";
import { Resizable } from "re-resizable";
import { useEditor } from "../../context/EditorContext";
import {
  Box,
  Dialog,
  DialogContent,
  useTheme,
  Button,
} from "@mui/material";

const ResizableDialog: React.FC = () => {
  const [open, setOpen] = useState(true);
  const { handleResize, dimensions } = useEditor();
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: "100%",
        height: "100vh",
        backgroundColor: "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Button
        variant="outlined"
        size="large"
        onClick={() => setOpen(true)}
        sx={{ display: "flex", justifyContent: "center", mx: "auto", top: 50 }}
      >
        Open Modal
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        slotProps={getDialogStyles(theme, dimensions.width, dimensions.height)}
      >
        <Resizable
          size={{ width: dimensions.width, height: dimensions.height }}
          minWidth={400}
          minHeight={300}
          maxWidth={1200}
          maxHeight={800}
          onResizeStop={(e, direction, ref, d) => {
            handleResize(e, {
              size: {
                width: dimensions.width + d.width,
                height: dimensions.height + d.height,
              },
            });
          }}
          handleComponent={{
            top: <ResizeHandle handleAxis="n" />,
            bottom: <ResizeHandle handleAxis="s" />,
            left: <ResizeHandle handleAxis="w" />,
            right: <ResizeHandle handleAxis="e" />,
            topLeft: <ResizeHandle handleAxis="nw" />,
            topRight: <ResizeHandle handleAxis="ne" />,
            bottomLeft: <ResizeHandle handleAxis="sw" />,
            bottomRight: <ResizeHandle handleAxis="se" />,
          }}
          style={{
            border: "1px solid #ddd",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <DialogContent
            sx={{
              p: 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              "&::-webkit-scrollbar": { display: "none" },
              scrollbarWidth: "none",
              "& > *": {
                // Target the Editor component
                flex: 1,
                minHeight: 0, // Allow content to shrink
              },
            }}
          >
            <Editor />
          </DialogContent>
        </Resizable>
      </Dialog>
    </Box>
  );
};

export default ResizableDialog;