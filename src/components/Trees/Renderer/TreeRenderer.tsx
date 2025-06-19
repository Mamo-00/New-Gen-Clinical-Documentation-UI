import React from "react";
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Stack,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Tooltip,
  useTheme,
} from "@mui/material";
import { TemplateField } from "../interfaces/iTemplateField";
import { FieldValue } from "../utilities/treeTypes";

// Props for the TreeRenderer component
interface TreeRendererProps {
  schema: TemplateField;
  values: Record<string, FieldValue>;
  onChange: (id: string, value: FieldValue) => void;
  depth?: number;
}

export const TreeRenderer: React.FC<TreeRendererProps> = ({
  schema,
  values,
  onChange,
  depth = 0,
}) => {
  const theme = useTheme();
  // Calculate indentation based on depth – for example, 16px per level if spacing(2) equals 16px.
  const indent = schema.isIndented ? theme.spacing(depth * 1.0) : 0;

  // Skip rendering if the field is marked as excluded
  if (schema.excluded) {
    return null;
  }

  // Conditional rendering: if this node should only appear when a dependent field has a given value.
  if (schema.conditionalOn) {
    const dependentValue = values[schema.conditionalOn];
    if (
      schema.conditionalValue !== undefined &&
      dependentValue !== schema.conditionalValue
    ) {
      return null;
    }
  }

  // If this node is a container, render its children recursively.
  if (schema.type === "container") {
    const direction = schema.layout === "horizontal" ? "row" : "column";
    return (
      <Box sx={{ pl: indent, mb: theme.spacing(1) }}>
        {schema.label && (
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            {schema.label}
          </Typography>
        )}
        <Stack direction={direction} spacing={1}>
          {schema.children?.map((child) => (
            <TreeRenderer
              key={child.id}
              schema={child}
              values={values}
              onChange={onChange}
              depth={depth + 1}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  // Render leaf nodes based on type.
  switch (schema.type) {
    case "text":
      return (
        <Box sx={{ pl: indent, mb: theme.spacing(1) }}>
          <Tooltip title={schema.helpText} placement="top">
            <TextField
              label={schema.label}
              value={values[schema.id] ?? (schema.defaultValue || "")}
              onChange={(e) => {
                onChange(schema.id, e.target.value);
              }}
              fullWidth
              size="small"
              sx={{ width: 100 }}
            />
          </Tooltip>
        </Box>
      );
    case "number":
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            pl: indent,
            my: theme.spacing(3),
          }}
          gap={1}
        >
          <Tooltip title={schema.helpText} placement="top">
            <TextField
              label={schema.label}
              type="number"
              value={values[schema.id] ?? (schema.defaultValue || "")}
              slotProps={{ htmlInput: { min: 1 } }}
              onChange={(e) => {
                const numValue = Number(e.target.value);
                onChange(schema.id, numValue);
              }}
              size="small"
              sx={{ width: 85, mb: theme.spacing(1) }}
            />
          </Tooltip>
          {schema.unit && (
            <Typography sx={{ ml: theme.spacing(1) }}>{schema.unit}</Typography>
          )}
        </Box>
      );
    case "checkbox": {
      const rawValue = values[schema.id];
      const checked =
        typeof rawValue === "boolean" ? rawValue : Boolean(schema.defaultValue);
      return (
        <Box sx={{ pl: indent, mb: theme.spacing(1) }}>
          <Tooltip title={schema.helpText} placement="top">
            <FormControlLabel
              control={
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    onChange(schema.id, e.target.checked);
                  }}
                />
              }
              label={schema.label}
            />
          </Tooltip>
        </Box>
      );
    }
    case "dropdown":
      return (
        <Box sx={{ pl: indent, mb: theme.spacing(1) }}>
          <Tooltip title={schema.helpText} placement="top">
            <FormControl fullWidth size="small">
              <InputLabel id={`${schema.id}-label`}>{schema.label}</InputLabel>
              <Select
                label={schema.label}
                labelId={`${schema.id}-label`}
                id={schema.id}
                defaultValue={""}
                value={values[schema.id] ?? (schema.defaultValue || "")}
                onChange={(e) => {
                  const selectedValue = e.target.value;
                  // Special logic for traadvev distribution field
                  if (schema.id === "distribution" && selectedValue === "fordeles i #1 og #2") {
                    // Also update vevsbiterCount to 2 when distribution is "fordeles i #1 og #2"
                    onChange("vevsbiterCount", 2);
                  } else if (schema.id === "distribution" && selectedValue === "i #1") {
                    // Set vevsbiterCount to 1 when distribution is "i #1"
                    onChange("vevsbiterCount", 1);
                  }
                  
                  onChange(schema.id, selectedValue);
                }}
                sx={{ width: 120, my: 1 }}
              >
                {schema.options?.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Tooltip>
        </Box>
      );
    default:
      return null;
  }
};
