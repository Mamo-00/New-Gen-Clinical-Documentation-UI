import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Box, Typography, TextField, Stack, Chip } from "@mui/material";
import { TreeRenderer } from "./Renderer/TreeRenderer";
import { FieldValue } from "./utilities/treeTypes";
import { TemplateField } from "./interfaces/iTemplateField";
import { useTemplate } from "../../context/TemplateContext";
import { extractValuesFromTemplate } from "../../utils/templates/templateParser";
import { updateTemplateFromTree } from "../../utils/templates/updateTemplate";
import { useEditor } from "../../context/EditorContext";
import {
  extractPlaceholdersFromTemplate,
  generateSchemaFromTemplate,
} from "../../utils/templates/placeholderRegistry";
import { flattenSchema } from "../../utils/templates/flattenSchema";
import TreePagination from "./Pagination/TreePagination";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { 
  setTreeItems as setReduxTreeItems, 
  setCurrentPage as setReduxCurrentPage, 
  setTemplateText,
  setEditorId as setReduxEditorId,
  updateTreeItemValue,
  TreeItem,
  updateTreeItemCount
} from "../../features/treeSlice";
import { store } from "../../app/store";

// ========== UTILITY FUNCTIONS ==========

/**
 * Processes a template to extract numbered line information.
 */
const detectAndExtractNumberedLines = (
  template: string
): {
  lineNumbers: number[];
  maxLineNumber: number;
} => {
  const linePattern = /^(\d+)\s*:/gm;
  const matches = Array.from(template.matchAll(linePattern));
  const lineNumbers = matches
    .map((match) => parseInt(match[1]))
    .sort((a, b) => a - b);
  const maxLineNumber = lineNumbers.length > 0 ? Math.max(...lineNumbers) : 0;

  return { lineNumbers, maxLineNumber };
};

/**
 * Initializes tree items with appropriate values and line numbers.
 */
const initializeTreeItems = (
  count: number,
  initialValues: Record<string, FieldValue>,
  lineNumbers: number[] = []
): TreeItem[] => {
  const items: TreeItem[] = [];

  for (let i = 1; i <= count; i++) {
    // Get the corresponding line number if available, otherwise use the item index
    const lineNumber = lineNumbers[i - 1] || i;

    // Create a copy of initial values with indexed versions for this line
    const itemValues = { ...initialValues };

    // Add indexed versions of placeholders
    Object.keys(initialValues).forEach((key: string) => {
      // Only add indexed values for placeholders that appear in numbered lines
      if (!key.includes("_") && lineNumber > 0) {
        const indexedKey = `${key}_${lineNumber}`;
        if (!(indexedKey in itemValues)) {
          itemValues[indexedKey] = initialValues[key];
        }
      }
    });

    items.push({
      id: i,
      lineNumber,
      values: itemValues,
    });
  }

  return items;
};

/**
 * Collects default values from a schema to use as initial values.
 */
const collectSchemaDefaultValues = (schema: TemplateField): Record<string, FieldValue> => {
  const defaultValues: Record<string, FieldValue> = {};
  
  const processNode = (node: TemplateField) => {
    if (node.id && node.defaultValue !== undefined) {
      defaultValues[node.id] = node.defaultValue;
    }
    
    if (node.children) {
      node.children.forEach(processNode);
    }
  };
  
  processNode(schema);
  return defaultValues;
};

/**
 * Combines values from all tree items into a single record with proper indexing.
 */
const collectAllTreeItemValues = (
  treeItems: TreeItem[],
  count: number
): Record<string, FieldValue> => {
  const allValues: Record<string, FieldValue> = { countField: count };
  
  // For each tree item, add its values with the proper line number indexing
  treeItems.forEach((item) => {
    const lineNumber = item.lineNumber;
    
    // For each value in the tree item
    Object.entries(item.values).forEach(([key, value]) => {
      // Store both the original key and an indexed version
      if (!key.includes('_')) {
        allValues[key] = value; // Original non-indexed key
        
        // Only create indexed versions for non-indexed keys
        if (lineNumber > 0) {
          const indexedKey = `${key}_${lineNumber}`;
          allValues[indexedKey] = value;
        }
      } else if (key.includes(`_${lineNumber}`)) {
        // Store existing indexed keys that match this item's line number
        allValues[key] = value;
      }
    });
  });
  
  return allValues;
};

/**
 * Adjusts the template text when count changes.
 */
const adjustTemplateForCount = (
  template: string,
  newCount: number,
  initialValues: Record<string, FieldValue>
): string => {
  console.log(`⚡ adjustTemplateForCount: newCount=${newCount}`);
  
  // Clean up initialValues to avoid duplicates
  const cleanedValues: Record<string, FieldValue> = {};
  
  // First, copy all non-indexed fields
  Object.keys(initialValues).forEach(key => {
    if (!key.includes('_')) {
      cleanedValues[key] = initialValues[key];
    }
  });
  
  // Then add properly indexed fields (only single underscore fields)
  Object.entries(initialValues).forEach(([key, value]) => {
    if (key.includes('_')) {
      const parts = key.split('_');
      if (parts.length === 2 && !isNaN(Number(parts[1]))) {
        const lineNum = Number(parts[1]);
        // Only keep indexed values for lines that will exist
        if (lineNum <= newCount) {
          cleanedValues[key] = value;
        }
      }
    }
  });
  
  // Detect line format like "1: text", "2: text"
  const linePattern = /(^\d+\s*:.+$)/gm;
  const lines = template.match(linePattern);

  if (!lines) {
    return template;
  }

  // Extract the line number and content for each match
  const parsedLines = lines
    .map((line) => {
      const match = line.match(/^(\d+)\s*:(.*?)$/);
      return match ? { num: parseInt(match[1]), text: match[2] } : null;
    })
    .filter(Boolean);

  // If we have parsed lines, adjust them based on newCount
  if (parsedLines.length > 0) {
    let result = template;

    // Find the highest existing line number
    const maxLine = Math.max(...parsedLines.map((l) => l!.num));

    // If newCount > maxLine, add new lines
    if (newCount > maxLine) {
      // Use first line as model for better format consistency
      const modelLine = parsedLines.find((l) => l!.num === 1) || parsedLines[0];
      
      if (modelLine) {
        // Add new lines using the model line's format
        for (let i = maxLine + 1; i <= newCount; i++) {
          // Append new line with increasing number but with clean format
          const newLineText = `\n${i}:${modelLine.text}`;
          result += newLineText;

          // Extract placeholders for logging (no functional purpose)
          const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
          let match;
          
          // Create a copy of the string for regex (to avoid regex state issues)
          const textToSearch = String(modelLine.text);
          while ((match = placeholderRegex.exec(textToSearch)) !== null) {
            // Skip countField as it's handled separately
            if (match[1].trim() === "countField") continue;
          }
        }
      }
    }
    // If newCount < maxLine, remove excess lines
    else if (newCount < maxLine) {
      // Find all lines with numbers > newCount
      for (let i = newCount + 1; i <= maxLine; i++) {
        // Create a regex that matches the entire line with this number
        const lineRegex = new RegExp(`^${i}\\s*:.*$`, "gm");
        
        // Remove the line
        result = result.replace(lineRegex, "");

        // Also remove any indexed values for removed lines
        const keysToRemove = Object.keys(initialValues)
          .filter((key) => key.includes(`_${i}`));
          
        keysToRemove.forEach((key) => {
          delete initialValues[key];
          delete cleanedValues[key];
        });
      }

      // Clean up any consecutive newlines resulting from removal
      result = result.replace(/\n\s*\n/g, "\n");
    }

    // Copy cleaned values back to initialValues
    Object.keys(initialValues).forEach(key => delete initialValues[key]);
    Object.entries(cleanedValues).forEach(([key, value]) => {
      initialValues[key] = value;
    });
    
    return result;
  }

  return template;
};

/**
 * Fixes missing indexed values in tree items.
 */
const fixTreeItemsIndexing = (
  treeItems: TreeItem[],
  templateText: string,
  dispatch: any
): boolean => {
  if (treeItems.length === 0 || !templateText) return false;
  
  // Get placeholders from template
  const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
  const placeholders = new Set<string>();
  let match;
  
  while ((match = placeholderPattern.exec(templateText)) !== null) {
    const placeholder = match[1].trim();
    if (placeholder !== "countField") {
      placeholders.add(placeholder);
    }
  }
  
  // Check for missing indexed values
  let itemsFixed = false;
  const updatedItems = [...treeItems];
  
  updatedItems.forEach((item) => {
    const lineNumber = item.lineNumber;
    if (lineNumber > 0) {
      placeholders.forEach(field => {
        const indexedField = `${field}_${lineNumber}`;
        
        // Add missing indexed values
        if (item.values[field] !== undefined && item.values[indexedField] === undefined) {
          item.values[indexedField] = item.values[field];
          itemsFixed = true;
        }
        
        // Add missing base values
        if (item.values[indexedField] !== undefined && item.values[field] === undefined) {
          item.values[field] = item.values[indexedField];
          itemsFixed = true;
        }
      });
    }
  });
  
  // Update Redux if we fixed any items
  if (itemsFixed) {
    dispatch(setReduxTreeItems(updatedItems));
  }
  
  return itemsFixed;
};

// ========== COMPONENT INTERFACES ==========

/**
 * Props for the DynamicTree component.
 */
interface DynamicTreeProps {
  title: string;
  schema: TemplateField;
  initialValues: Record<string, FieldValue>;
  itemLabel?: string;
  editorId: string;
}

/**
 * Refactored DynamicTree component with better internal organization.
 * This version maintains all the functionality of the original but with cleaner code structure.
 */
const DynamicTreeRefactored: React.FC<DynamicTreeProps> = ({
  title,
  schema,
  editorId,
  itemLabel = "item",
}) => {
  const dispatch = useAppDispatch();
  const { treeItems, currentPage } = useAppSelector(state => state.tree);
  const itemsPerPage = 1; // Fixed at 1 item per page
  
  const { setContent: setEditorContent } = useEditor();
  const { selectedTemplate, setSelectedTemplate } = useTemplate();
  const [sourceTemplate, setSourceTemplate] = useState<string>("");
  const [enhancedSchema, setEnhancedSchema] = useState<TemplateField>(schema);
  const [count, setCount] = useState<number>(schema.countField || 1);
  const [hasCountFieldPlaceholder, setHasCountFieldPlaceholder] = useState<boolean>(false);
  
  // Reference to track previous page
  const prevPageRef = useRef<number>(currentPage);

  // ========== MEMOIZED VALUES ==========
  
  /**
   * Format the item label with proper capitalization.
   */
  const capitalizedItemLabel = useMemo(
    () => itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1),
    [itemLabel]
  );

  /**
   * Determines if pagination controls should be displayed.
   */
  const shouldShowPagination = useMemo(
    () => hasCountFieldPlaceholder && treeItems.length > 1,
    [hasCountFieldPlaceholder, treeItems.length]
  );

  /**
   * Calculate current items and display info for pagination.
   */
  const currentItemsData = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    
    return {
      items: treeItems.slice(indexOfFirstItem, indexOfLastItem),
      indexOfFirstItem,
      indexOfLastItem,
      displayInfo: {
        start: indexOfFirstItem + 1,
        end: Math.min(indexOfLastItem, treeItems.length),
        total: treeItems.length
      }
    };
  }, [treeItems, currentPage, itemsPerPage]);

  /**
   * Create a filtered schema that excludes countField.
   */
  const filteredSchema = useMemo(() => {
    // Helper function to recursively remove countField from schema
    const filterCountField = (node: TemplateField): TemplateField => {
      if (node.id === "countField") {
        return { ...node, excluded: true }; // Mark for exclusion
      }

      if (node.children && node.children.length > 0) {
        return {
          ...node,
          children: node.children
            .map(filterCountField)
            .filter((child) => !child.excluded), // Filter out excluded nodes
        };
      }

      return node;
    };

    return filterCountField(enhancedSchema);
  }, [enhancedSchema]);

  // ========== CALLBACKS ==========

  /**
   * Handle page change in pagination.
   */
  const handlePageChange = useCallback((newPage: number) => {
    console.log(`📄 Page change: from ${currentPage} to ${newPage}`);
    dispatch(setReduxCurrentPage(newPage));
  }, [currentPage, dispatch]);

  /**
   * Handles changes to field values in the UI.
   */
  const handleFieldChange = useCallback(
    (itemIndex: number, fieldId: string, value: FieldValue) => {
      console.log(`🔄 Field change: itemIndex=${itemIndex}, fieldId=${fieldId}`);
      
      // Get the tree item and its line number
      const treeItem = treeItems[itemIndex];
      if (!treeItem) {
        console.error(`No tree item found at index ${itemIndex}`);
        return;
      }

      const lineNumber = treeItem.lineNumber;

      // Check if the value is actually different from the current value
      const currentValue = treeItem.values[fieldId];
      
      if (currentValue === value) {
        return;
      }
      
      // Dispatch the Redux action to update state
      dispatch(updateTreeItemValue({
        itemIndex,
        fieldId,
        value,
        lineNumber
      }));
      
      // Update the template after the state changes
      setTimeout(() => {
        if (selectedTemplate && sourceTemplate) {
          // Get the latest state from Redux
          const currentState = store.getState().tree;
          const latestTreeItems = currentState.treeItems;
          
          // Collect all values from the tree items
          const allValues = collectAllTreeItemValues(latestTreeItems, count);
          
          // Update the template
          const updatedTemplate = updateTemplateFromTree(
            sourceTemplate,
            allValues
          );
          
          // Update the template in the UI
          setSelectedTemplate({
            text: updatedTemplate,
            category: selectedTemplate.category,
          });

          // Update the editor
          setEditorContent(editorId, updatedTemplate);
        }
      }, 0);
    },
    [treeItems, selectedTemplate, sourceTemplate, setSelectedTemplate, setEditorContent, editorId, dispatch, count]
  );

  /**
   * Handles changes to the count field (number of items).
   */
  const handleCountChange = useCallback(
    (newCount: number) => {
      console.log(`🔥 Count change: newCount=${newCount}`);
      
      if (newCount < 1) {
        return;
      }

      // Store current count for page navigation
      const oldCount = treeItems.length;
      
      // Update count state
      setCount(newCount);
      
      if (hasCountFieldPlaceholder && selectedTemplate && sourceTemplate) {
        // Use selectedTemplate text as base
        const currentTemplateText = selectedTemplate.text;
        
        // Start with countField in base values
        const baseValues: Record<string, FieldValue> = {
          countField: newCount,
        };

        // Get schema default values
        const schemaInitialValues = collectSchemaDefaultValues(schema);
        
        // Combine all initial values
        const allValues: Record<string, FieldValue> = { 
          ...baseValues, 
          ...schemaInitialValues 
        };
        
        // Get existing line numbers
        const { lineNumbers, maxLineNumber } = detectAndExtractNumberedLines(currentTemplateText);
        
        // Process existing tree items to preserve their values
        const maxItemsToProcess = Math.min(treeItems.length, newCount);
        for (let i = 0; i < maxItemsToProcess; i++) {
          const item = treeItems[i];
          const lineNumber = item.lineNumber;
          
          // For each value in this item
          Object.entries(item.values).forEach(([key, value]) => {
            // Store base fields
            if (!key.includes('_')) {
              allValues[key] = value;
              
              // Create indexed version
              if (lineNumber > 0) {
                const indexedKey = `${key}_${lineNumber}`;
                allValues[indexedKey] = value;
              }
            } else if (key.includes(`_${lineNumber}`)) {
              // Store already-indexed values for this line
              allValues[key] = value;
            }
          });
        }
        
        // Pre-populate values for new lines with schema defaults
        for (let lineNum = maxLineNumber + 1; lineNum <= newCount; lineNum++) {
          Object.entries(schemaInitialValues).forEach(([fieldId, defaultValue]) => {
            const indexedKey = `${fieldId}_${lineNum}`;
            allValues[indexedKey] = defaultValue;
          });
        }
        
        // Adjust the template
        const adjustedTemplate = adjustTemplateForCount(
          currentTemplateText,
          newCount,
          allValues
        );
        
        // Update the template in the UI
        setSelectedTemplate({
          text: adjustedTemplate,
          category: selectedTemplate.category,
        });

        // Update the editor
        setEditorContent(editorId, adjustedTemplate);
        
        // Extract line numbers from the adjusted template
        const { lineNumbers: updatedLineNumbers } = detectAndExtractNumberedLines(adjustedTemplate);
        
        // Update Redux state
        dispatch(updateTreeItemCount({
          newCount,
          initialValues: allValues,
          lineNumbers: updatedLineNumbers
        }));
        
        // Set appropriate page
        if (newCount > oldCount) {
          // Navigate to the newly added line
          dispatch(setReduxCurrentPage(newCount));
        } else if (newCount < oldCount && currentPage > newCount) {
          // Go to the last valid page if current page is now invalid
          dispatch(setReduxCurrentPage(newCount));
        }
      }
    },
    [treeItems, selectedTemplate, sourceTemplate, hasCountFieldPlaceholder, setSelectedTemplate, setEditorContent, editorId, schema, dispatch, currentPage]
  );

  /**
   * Enhances schema with placeholders found in the template.
   */
  const enhanceSchemaWithForeignPlaceholders = useCallback(
    (templateText: string, baseSchema: TemplateField) => {
      // Extract all placeholders from the template
      const allPlaceholders = extractPlaceholdersFromTemplate(templateText);

      // Get schema fields
      const flattenedSchema = flattenSchema(baseSchema);
      const schemaFields = Object.keys(flattenedSchema);

      // Check if we have placeholders not in the schema
      const hasForeignPlaceholders = allPlaceholders
        .filter((p) => p !== "countField")
        .some((p) => !schemaFields.includes(p));

      // Create the appropriate schema
      let schemaToUse = baseSchema;
      
      if (hasForeignPlaceholders) {
        // Generate schema from template placeholders
        const placeholderSchema = generateSchemaFromTemplate(templateText);

        // Get foreign fields from the placeholder schema
        const foreignFields =
          placeholderSchema.children?.flatMap(
            (container) => container.children || []
          ) || [];

        // Filter out countField and existing fields
        const filteredForeignFields = foreignFields.filter(
          (field) =>
            !schemaFields.includes(field.id) && field.id !== "countField"
        );

        // Create enhanced schema only if we have foreign fields
        if (filteredForeignFields.length > 0) {
          const foreignFieldsContainer: TemplateField = {
            id: "foreignFields",
            type: "container",
            label: "Additional Fields",
            layout: "vertical",
            children: filteredForeignFields,
          };
          
          schemaToUse = {
            ...baseSchema,
            children: [
              ...(baseSchema.children || []),
              foreignFieldsContainer,
            ],
          };
          
          setEnhancedSchema(schemaToUse);
        } else {
          setEnhancedSchema(baseSchema);
        }
      } else {
        // No foreign placeholders, use original schema
        setEnhancedSchema(baseSchema);
      }
      
      return schemaToUse;
    },
    []
  );

  // ========== EFFECTS ==========

  /**
   * Initialize Redux store with editorId.
   */
  useEffect(() => {
    dispatch(setReduxEditorId(editorId));
  }, [dispatch, editorId]);

  /**
   * Initialize the component when a template is loaded.
   */
  useEffect(() => {
    if (selectedTemplate) {
      const originalText = selectedTemplate.text;

      // Check for countField
      const hasCountField = originalText.includes("{{countField}}");
      setHasCountFieldPlaceholder(hasCountField);
      
      // Get line numbers from template
      const { lineNumbers, maxLineNumber } = detectAndExtractNumberedLines(originalText);
      
      // Set source template
      setSourceTemplate(originalText);
      dispatch(setTemplateText(originalText));
      
      // If we have numbered lines with countField, set the count
      if (maxLineNumber > 0 && hasCountField) {
        setCount(maxLineNumber);
      }
      
      // Enhance schema with any foreign placeholders
      const processedSchema = enhanceSchemaWithForeignPlaceholders(originalText, schema);
      
      // Extract values from template
      const extractedValues = extractValuesFromTemplate(originalText, processedSchema);
      
      // Remove countField from extracted values
      if (extractedValues.countField !== undefined) {
        const countValue = Number(extractedValues.countField);
        if (!isNaN(countValue) && countValue > 0) {
          setCount(countValue);
        }
        delete extractedValues.countField;
      }
      
      // Initialize tree items
      const newTreeItems = initializeTreeItems(
        Math.max(lineNumbers.length, 1),
        extractedValues,
        lineNumbers
      );
      
      dispatch(setReduxTreeItems(newTreeItems));
    }
  }, [schema, dispatch]);

  /**
   * Ensure template text stays in sync with tree items when switching pages.
   * Only run when the page actually changes.
   */
  useEffect(() => {
    if (prevPageRef.current !== currentPage && sourceTemplate) {
      console.log(`📄 Page changed to ${currentPage}, updating template`);
      prevPageRef.current = currentPage;
      
      // Update template on page change to ensure consistency
      setTimeout(() => {
        if (selectedTemplate) {
          // Fix any missing indexed values
          fixTreeItemsIndexing(treeItems, selectedTemplate.text, dispatch);
          
          // Update template with the latest values if needed
          const allValues = collectAllTreeItemValues(treeItems, count);
          const updatedTemplate = updateTemplateFromTree(sourceTemplate, allValues);
          
          if (updatedTemplate !== selectedTemplate.text) {
            setSelectedTemplate({
              text: updatedTemplate,
              category: selectedTemplate.category,
            });
            
            setEditorContent(editorId, updatedTemplate);
          }
        }
      }, 0);
    }
  }, [currentPage, sourceTemplate, treeItems, selectedTemplate, dispatch, count, setSelectedTemplate, setEditorContent, editorId]);

  /**
   * Populate the template with initial values once sourceTemplate and treeItems are set.
   * This effect:
   * 1. Combines all values from tree items with the proper indexing
   * 2. Updates the template text with these values
   * 3. Updates the editor content
   */
  useEffect(() => {
    if (selectedTemplate && sourceTemplate && treeItems.length > 0) {
      // Only run this effect on initial load, not on every treeItems change
      // We use the useEffect for field changes to handle template updates after changes
      
      // Prepare values for template update, including both indexed and non-indexed
      const allValues: Record<string, FieldValue> = { countField: count };

      // For each tree item, add its values with the proper line number indexing
      treeItems.forEach((item) => {
        // For each value in the tree item
        Object.entries(item.values).forEach(([key, value]) => {
          // Store both the original key and an indexed version
          allValues[key] = value; // Original non-indexed key (for backward compatibility)

          // Add this check before creating indexed versions
          if (!key.includes("_") && item.lineNumber > 0) {
            const indexedKey = `${key}_${item.lineNumber}`;
            allValues[indexedKey] = value;
          }
        });
      });

      const initialTemplateText = updateTemplateFromTree(
        sourceTemplate,
        allValues
      );

      setSelectedTemplate({
        text: initialTemplateText,
        category: selectedTemplate.category,
      });

      setEditorContent(editorId, initialTemplateText);
    }
    // Only run on sourceTemplate change, not on treeItems changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTemplate, editorId, count]);

  /**
   * Ensure tree items have appropriate indexed values
   * Fix specific placeholders that may be missing indexed variants
   */
  useEffect(() => {
    if (treeItems.length > 0 && selectedTemplate?.text) {
      // Identify fields used in the template
      const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
      const templateText = selectedTemplate.text;
      const placeholders = new Set<string>();
      let match;
      
      // Get all placeholders from template
      while ((match = placeholderPattern.exec(templateText)) !== null) {
        const placeholder = match[1].trim();
        if (placeholder !== "countField") {
          placeholders.add(placeholder);
        }
      }
      
      // Check if any tree items are missing indexed values for these placeholders
      let itemsFixed = false;
      
      // Clone the tree items to avoid direct state mutation
      const updatedItems = [...treeItems];
      
      updatedItems.forEach((item, index) => {
        const lineNumber = item.lineNumber;
        if (lineNumber > 0) {
          // For each placeholder, ensure both base and indexed values exist
          placeholders.forEach(field => {
            const indexedField = `${field}_${lineNumber}`;
            
            // If there's a base value but no indexed value, add it
            if (item.values[field] !== undefined && item.values[indexedField] === undefined) {
              console.log(`🔧 Fixing tree item ${index+1}: Adding missing ${indexedField} with value ${item.values[field]}`);
              // Update the item to add the indexed field
              item.values[indexedField] = item.values[field];
              itemsFixed = true;
            }
            
            // If there's an indexed value but no base value, add it
            if (item.values[indexedField] !== undefined && item.values[field] === undefined) {
              console.log(`🔧 Fixing tree item ${index+1}: Adding missing base field ${field} with value ${item.values[indexedField]}`);
              item.values[field] = item.values[indexedField];
              itemsFixed = true;
            }
          });
        }
      });
      
      // If we fixed any items, update the Redux store
      if (itemsFixed) {
        console.log(`🔧 Updated tree items with fixed indexed values`);
        dispatch(setReduxTreeItems(updatedItems));
      }
    }
  }, [treeItems, selectedTemplate, dispatch]);

  // Get currentItems and related pagination data
  const { items: currentItems, indexOfFirstItem, displayInfo } = currentItemsData;

  // ========== RENDER ==========
  return (
    <Box sx={{ p: 2 }}>
      {/* Header with title */}
      <Typography variant="h6" sx={{ mb: 2, textTransform: "capitalize" }}>
        {title}
      </Typography>
      
      {/* Controls section */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, alignItems: "center" }}>
        {hasCountFieldPlaceholder && (
          <TextField
            label={`Antall ${itemLabel}`}
            type="number"
            value={count}
            onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
            InputProps={{ inputProps: { min: 1 } }}
            size="small"
            sx={{ width: 120 }}
          />
        )}
      </Stack>

      {/* Top pagination */}
      {shouldShowPagination && (
        <TreePagination
          totalItems={treeItems.length}
          currentPage={currentPage}
          setCurrentPage={handlePageChange}
          itemsPerPage={itemsPerPage}
          displayInfo={displayInfo}
          itemLabel={itemLabel}
          position="top"
        />
      )}

      {/* Render current tree items */}
      {currentItems.map((item, index) => (
        <Box
          key={item.id}
          sx={{
            mb: 4,
            border: "2px solid #eee",
            p: 2,
            pb: 0,
            borderRadius: 1,
            position: "relative",
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="subtitle1">
              {`${capitalizedItemLabel} ${item.id} (Linje ${item.lineNumber})`}
            </Typography>
            {shouldShowPagination && (
              <Chip
                label={`${indexOfFirstItem + index + 1} av ${treeItems.length}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          <TreeRenderer
            schema={filteredSchema}
            values={item.values}
            onChange={(fieldId, value) =>
              handleFieldChange(indexOfFirstItem + index, fieldId, value)
            }
          />
        </Box>
      ))}

      {/* Bottom pagination */}
      {shouldShowPagination && (
        <TreePagination
          totalItems={treeItems.length}
          currentPage={currentPage}
          setCurrentPage={handlePageChange}
          itemsPerPage={itemsPerPage}
          itemLabel={itemLabel}
          position="bottom"
        />
      )}
    </Box>
  );
};

export default React.memo(DynamicTreeRefactored); 