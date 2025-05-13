// src/components/Mikroskopi/Renderer.tsx
import React, { useMemo, useCallback } from 'react';
import {
    Box,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    FormGroup,
    TextField,
    Typography,
    Tooltip
} from '@mui/material';
import { useAppDispatch } from '../../app/hooks';
import { setMikroskopiFieldValueForCurrentBlock } from '../../features/mikroskopiSlice';
import { FieldValue } from '../Trees/utilities/treeTypes'; // Reuse type
import { MikroskopiPanelField } from './interface/iMikroskopiPanelField';

interface RenderFieldProps {
    panelId: string;
    field: MikroskopiPanelField;
    currentValue: FieldValue; // Current value from Redux
    allPanelValues: Record<string, FieldValue>; // All values for *this* panel for conditional checks
}

const RenderField: React.FC<RenderFieldProps> = React.memo(({
    panelId,
    field,
    currentValue,
    allPanelValues
}) => {
    const dispatch = useAppDispatch();

    // --- Conditional Rendering Logic ---
    // Moved outside the switch for clarity
    let shouldRender = true;
    if (field.conditionalOn) {
        const dependentValue = allPanelValues[field.conditionalOn];
        if (field.conditionalValue !== undefined && dependentValue !== field.conditionalValue) {
            shouldRender = false;
        }
        if (field.conditionalValue_not !== undefined && dependentValue === field.conditionalValue_not) {
           shouldRender = false;
        }
    }

    // Memoized callback for value changes
    const handleValueChange = useCallback((value: FieldValue) => {
        dispatch(setMikroskopiFieldValueForCurrentBlock({ panelId, fieldId: field.id, value }));
    }, [dispatch, panelId, field.id]);

    // --- Input Element Rendering ---
    const inputElement = useMemo(() => {
        if (!shouldRender) return null; // Return early if condition not met

        switch (field.type) {
             case 'dropdown':
                return (
                    <FormControl fullWidth margin="dense" size="small">
                        <InputLabel id={`${panelId}-${field.id}-label`}>{field.label}</InputLabel>
                        <Select
                            labelId={`${panelId}-${field.id}-label`}
                            label={field.label}
                            value={currentValue ?? field.defaultValue}
                            onChange={(e) => handleValueChange(e.target.value)}
                        >
                            {field.options?.map((opt) => (
                                <MenuItem key={opt} value={opt}>
                                    {opt}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                );
            case 'checkbox':
                 // Ensure consistent boolean handling
                 const isChecked = currentValue === undefined ? Boolean(field.defaultValue) : Boolean(currentValue);
                return (
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={isChecked}
                                onChange={(e) => handleValueChange(e.target.checked)}
                                size="small"
                            />
                        }
                        label={<Typography variant="body2">{field.label}</Typography>}
                        sx={{ mr: 1, height: '38px' }} // Align height roughly with textfields
                    />
                );
            case 'checkboxGroup':
                return (
                    <FormControl component="fieldset" margin="dense">
                        <Typography variant="caption" component="legend" sx={{ mb: 0.5, color: 'text.secondary', fontWeight: 'medium' }}>{field.label}</Typography>
                        <FormGroup row sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                            {field.options?.map((opt) => (
                                <FormControlLabel
                                    key={opt}
                                    control={
                                        <Checkbox
                                            // Ensure value is treated as an object, default to empty if undefined
                                            checked={(currentValue as Record<string, boolean>)?.[opt] ?? false}
                                            onChange={(e) => {
                                                const currentGroupValues = (currentValue as Record<string, boolean>) ?? {};
                                                handleValueChange({
                                                    ...currentGroupValues,
                                                    [opt]: e.target.checked,
                                                });
                                            }}
                                            size="small"
                                        />
                                    }
                                    label={<Typography variant="body2">{opt}</Typography>}
                                    sx={{ mr: 1, height: '38px' }} // Align height
                                />
                            ))}
                        </FormGroup>
                    </FormControl>
                );
            case 'number':
                return (
                    <TextField
                        label={field.label}
                        type="number"
                        value={currentValue ?? field.defaultValue}
                        onChange={(e) => handleValueChange(Number(e.target.value))}
                        size="small"
                        margin="dense"
                        InputProps={{
                            endAdornment: field.unit ? <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>{field.unit}</Typography> : null,
                            inputProps: { min: 0 } // Example: prevent negative numbers if appropriate
                        }}
                        sx={{ maxWidth: 150 }} // Limit width for numbers
                    />
                );
            case 'text':
                return (
                    <TextField
                        label={field.label}
                        value={currentValue ?? field.defaultValue}
                        onChange={(e) => handleValueChange(e.target.value)}
                        size="small"
                        margin="dense"
                        fullWidth
                        variant="outlined"
                    />
                );
            default:
                return null;
        }
    // Include field.type, field.label etc., in dependencies if they could theoretically change,
    // though usually they are static from the dictionary.
    }, [field, currentValue, allPanelValues, handleValueChange, shouldRender]);

    // Render only if shouldRender is true
    if (!shouldRender) {
        return null;
    }

    // Wrap with Tooltip if helpText exists
    return field.helpText ? (
        <Tooltip title={field.helpText} placement="top-start" arrow>
            <Box>{inputElement}</Box>
        </Tooltip>
    ) : (
        // Render directly without tooltip if no helpText
        inputElement
    );
});

export default RenderField;