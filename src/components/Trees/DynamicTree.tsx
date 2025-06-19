import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
  filterSchemaByPlaceholders,
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
  updateTreeItemCount,
} from "../../features/treeSlice";
import { store } from "../../app/store";
import { polypp, tarmscreening } from "./utilities/tree-schema";

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
 * Recursively searches for a field with the specified ID in a template schema and returns its default value.
 */
const findFieldDefaultValue = (
  baseFieldName: string,
  schema: TemplateField
): FieldValue | null => {
  // Check if this node has the ID we're looking for
  if (schema.id === baseFieldName && schema.defaultValue !== undefined) {
    return schema.defaultValue;
  }

  // If this node has children, check them
  if (schema.children && schema.children.length > 0) {
    for (const child of schema.children) {
      const foundValue = findFieldDefaultValue(baseFieldName, child);
      if (foundValue !== null) {
        return foundValue;
      }
    }
  }

  return null;
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

  // Ensure countField is set correctly in initial values
  initialValues.countField = count;

  for (let i = 1; i <= count; i++) {
    // Get the corresponding line number if available, otherwise use the item index
    const lineNumber = lineNumbers[i - 1] || i;

    // Create a copy of initial values with indexed versions for this line
    const itemValues = { ...initialValues };

    // Ensure countField is set correctly for this item
    itemValues.countField = count;

    // Set the indexed countField value for this line
    if (lineNumber > 0) {
      itemValues[`countField_${lineNumber}`] = count;
    }

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
 * Combines values from all tree items into a single record with proper indexing.
 */
const collectAllTreeItemValues = (
  treeItems: TreeItem[],
  count: number,
  schema: TemplateField
): Record<string, FieldValue> => {
  // IMPORTANT: Start with countField to ensure it's included
  const allValues: Record<string, FieldValue> = { countField: count };

  // For each tree item, add its values with the proper line number indexing
  treeItems.forEach((item) => {
    const lineNumber = item.lineNumber;

    // Set countField for this line explicitly
    if (lineNumber > 0) {
      allValues[`countField_${lineNumber}`] = count;
    }

    // For each value in the tree item
    Object.entries(item.values).forEach(([key, value]) => {
      // Store both the original key and an indexed version
      if (!key.includes("_")) {
        // Store the base field value
        const defaultValue = findFieldDefaultValue(key, schema);
        allValues[key] = defaultValue || value;
      } else if (key.includes(`_${lineNumber}`)) {
        // Store existing indexed keys that match this item's line number
        allValues[key] = value;
      }
    });
  });

  // Double-check that countField is set properly for all possible lines
  for (let i = 1; i <= treeItems.length; i++) {
    allValues[`countField_${i}`] = count;
  }

  // Double-check that base countField is set properly
  allValues.countField = count;

  return allValues;
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
      placeholders.forEach((field) => {
        const indexedField = `${field}_${lineNumber}`;

        // Add missing indexed values
        if (
          item.values[field] !== undefined &&
          item.values[indexedField] === undefined
        ) {
          item.values[indexedField] = item.values[field];
          itemsFixed = true;
        }

        // Add missing base values
        if (
          item.values[indexedField] !== undefined &&
          item.values[field] === undefined
        ) {
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
const DynamicTree: React.FC<DynamicTreeProps> = ({
  schema,
  editorId,
  itemLabel = "item",
}) => {
  const dispatch = useAppDispatch();
  const { treeItems, currentPage } = useAppSelector((state) => state.tree);
  const itemsPerPage = 1; // Fixed at 1 item per page

  const { setContent: setEditorContent } = useEditor();
  const { selectedTemplate, setSelectedTemplate } = useTemplate();
  const [enhancedSchema, setEnhancedSchema] = useState<TemplateField>(schema);
  const [count, setCount] = useState<number>(schema.countField || 1);
  const [hasCountFieldPlaceholder, setHasCountFieldPlaceholder] =
    useState<boolean>(false);
  const [maxAllowedLines, setMaxAllowedLines] = useState<number>(1);

  // Reference to track previous page
  const prevPageRef = useRef<number>(currentPage);

  /**
   * Adjusts the template text when count changes.
   */
  const adjustTemplateForCount = (
    template: string,
    newCount: number,
    initialValues: Record<string, FieldValue>
  ): string => {

    // Clean up initialValues to avoid duplicates
    const cleanedValues: Record<string, FieldValue> = {};

    // IMPORTANT: Make sure countField has the correct value
    cleanedValues.countField = newCount;
    initialValues.countField = newCount;

    // First, copy all non-indexed fields
    Object.keys(initialValues).forEach((key) => {
      if (!key.includes("_")) {
        cleanedValues[key] = initialValues[key];
      }
    });

    // Set countField for all line numbers
    for (let i = 1; i <= newCount; i++) {
      const indexedCountField = `countField_${i}`;
      cleanedValues[indexedCountField] = newCount;
      initialValues[indexedCountField] = newCount;
    }

    // Then add properly indexed fields (only single underscore fields)
    Object.entries(initialValues).forEach(([key, value]) => {
      if (key.includes("_")) {
        const parts = key.split("_");
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
    const lines = selectedTemplate?.originalText.match(linePattern);

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
        const modelLine =
          parsedLines.find((l) => l!.num === 1) || "";

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
          const keysToRemove = Object.keys(initialValues).filter((key) =>
            key.includes(`_${i}`)
          );

          keysToRemove.forEach((key) => {
            delete initialValues[key];
            delete cleanedValues[key];
          });
        }

        // Clean up any consecutive newlines resulting from removal
        result = result.replace(/\n\s*\n/g, "\n");
      }

      // Double-check countField is set correctly before copying values back
      cleanedValues.countField = newCount;

      // Make sure all indexed countField values are set
      for (let i = 1; i <= newCount; i++) {
        cleanedValues[`countField_${i}`] = newCount;
      }

      // Copy cleaned values back to initialValues
      Object.keys(initialValues).forEach((key) => delete initialValues[key]);
      Object.entries(cleanedValues).forEach(([key, value]) => {
        initialValues[key] = value;
      });

      return result;
    }

    return template;
  };

  // ========== CALLBACKS ========== //

  /**
   * Enhances schema with placeholders found in the template.
   */
  const enhanceSchemaWithForeignPlaceholders = useCallback(
    (
      templateText: string,
      baseSchema: TemplateField
    ): {
      schemaToUse: TemplateField;
      filteredForeignFields: TemplateField[];
    } => {
      // Extract all placeholders from the template
      const allPlaceholders = extractPlaceholdersFromTemplate(templateText);
      const allowedIds = new Set(allPlaceholders.filter((p) => p !== "countField"));

      // Get schema fields
      const flattenedSchema = flattenSchema(baseSchema);
      const schemaFields = Object.keys(flattenedSchema);

      // Check if we have placeholders not in the schema
      const hasForeignPlaceholders = allPlaceholders
        .filter((p) => p !== "countField")
        .some((p) => !schemaFields.includes(p));

      // Create the appropriate schema
      let filteredSchema = filterSchemaByPlaceholders(baseSchema, allowedIds);
      let schemaToUse = filteredSchema || baseSchema;
      let filteredForeignFields: TemplateField[] = []; // Initialize here to be in the outer scope

      if (hasForeignPlaceholders) {
        // Generate schema from template placeholders
        const placeholderSchema = generateSchemaFromTemplate(templateText);

        // Get foreign fields from the placeholder schema
        const fields =
          placeholderSchema.children?.flatMap(
            (container) => container.children || []
          ) || [];

        // Filter out countField and existing fields
        filteredForeignFields = fields.filter(
          (field) =>
            !schemaFields.includes(field.id) && field.id !== "countField"
        );

        // Create enhanced schema only if we have foreign fields
        if (filteredForeignFields.length > 0) {
          // Find which schema the foreign fields belong to
          const allSchemas = [polypp, tarmscreening];
          let foreignSchemaLabel = "Ekstra Felt"; // Default fallback

          // Check each schema to find which one contains these fields
          for (const schema of allSchemas) {
            const flatSchema = flattenSchema(schema);
            const schemaFields = Object.keys(flatSchema);
            
            // If all foreign fields are found in this schema, use its label
            if (filteredForeignFields.every(field => schemaFields.includes(field.id))) {
              foreignSchemaLabel = schema.label || schema.id.charAt(0).toUpperCase() + schema.id.slice(1);
              break;
            }
          }

          const foreignFieldsContainer: TemplateField = {
            id: "foreignFields",
            type: "container",
            label: foreignSchemaLabel,
            layout: "vertical",
            children: filteredForeignFields,
          };

          // Add the foreign fields container to the filtered schema
          const baseForChildren = filteredSchema || baseSchema;
          schemaToUse = {
            ...baseForChildren,
            children: [
              ...(baseForChildren.children || []),
              foreignFieldsContainer,
            ],
          };

          setEnhancedSchema(schemaToUse);
        } else {
          setEnhancedSchema(schemaToUse);
        }
      } else {
        // No foreign placeholders, use filtered schema
        setEnhancedSchema(schemaToUse);
      }
      return { schemaToUse, filteredForeignFields };
    },
    []
  );

  /**
   * Handle page change in pagination.
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      dispatch(setReduxCurrentPage(newPage));
    },
    [currentPage, dispatch]
  );

  /**
   * Handles changes to field values in the UI.
   */
  const handleFieldChange = useCallback(
    (itemIndex: number, fieldId: string, value: FieldValue) => {

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

      // Check if this is a foreign field (not in the original schema)
      // This keeps foreign fields consistent across all tree items
      const baseFieldId = fieldId.includes("_")
        ? fieldId.split("_")[0]
        : fieldId;

      const { schemaToUse } = enhancedSchemaData;

      // Dispatch the Redux action to update state
      dispatch(
        updateTreeItemValue({
          itemIndex,
          fieldId,
          value,
          lineNumber,
          updateBaseField: true, // Always update base field for the primary item being edited
        })
      );

      // Update foreign field on all other tree items
      treeItems.forEach((item, idx) => {
        if (idx !== itemIndex) {
          // Skip the item we just updated
          const itemLineNumber = item.lineNumber;

          // Also update the indexed version for this line
          if (itemLineNumber > 0) {
            // Update the indexed version that corresponds to the original item being changed
            // For example, if changing tree item 1's measurement_1, update measurement_1 in all other items
            const indexedFieldId = `${baseFieldId}_${lineNumber}`;

            dispatch(
              updateTreeItemValue({
                itemIndex: idx,
                fieldId: indexedFieldId,
                value,
                lineNumber: itemLineNumber,
                updateBaseField: false, // Don't update base field for other items
              })
            );
          }
        }
      });

      // Update the template after the state changes
      setTimeout(() => {
        if (selectedTemplate && selectedTemplate.originalText) {
          // Get the latest state from Redux
          const currentState = store.getState().tree;
          const latestTreeItems = currentState.treeItems;

          // Collect all values from the tree items
          const allValues = collectAllTreeItemValues(
            latestTreeItems,
            count,
            schemaToUse
          );

          // Ensure countField is set correctly
          allValues.countField = count;

          // Update the template
          const updatedTemplate = updateTemplateFromTree(
            selectedTemplate.originalText,
            allValues
          );

          // Update the template in the UI
          setSelectedTemplate({
            ...selectedTemplate,
            text: updatedTemplate,
          });

          // Update the editor
          setEditorContent(editorId, updatedTemplate);
        }
      }, 0);
    },
    [
      treeItems,
      selectedTemplate,
      setEditorContent,
      editorId,
      dispatch,
      count,
      schema,
    ]
  );

  /**
   * Handles changes to the count field (number of items).
   */
  const handleCountChange = useCallback(
    (newCount: number) => {
      // Cap newCount to maxAllowedLines
      const cappedCount = Math.max(1, Math.min(newCount, maxAllowedLines));
      if (cappedCount < 1) {
        return;
      }
      // Store current count for page navigation
      const oldCount = treeItems.length;
      setCount(cappedCount);
      if (hasCountFieldPlaceholder && selectedTemplate && selectedTemplate.originalText) {
        // Use selectedTemplate text as base
        const currentTemplateText = selectedTemplate.text;
        // Get schema default values
        const { schemaToUse } = enhancedSchemaData;
        // Combine all initial values
        const allValues = collectAllTreeItemValues(
          treeItems,
          cappedCount,
          schemaToUse
        );
        allValues.countField = cappedCount;
        // Adjust the template
        const adjustedTemplate = adjustTemplateForCount(
          currentTemplateText,
          cappedCount,
          allValues
        );
        setSelectedTemplate({
          ...selectedTemplate,
          text: adjustedTemplate,
        });
        setEditorContent(editorId, adjustedTemplate);
        // Extract line numbers from the adjusted template
        const { lineNumbers: updatedLineNumbers } =
          detectAndExtractNumberedLines(adjustedTemplate);
        dispatch(
          updateTreeItemCount({
            newCount: cappedCount,
            initialValues: allValues,
            lineNumbers: updatedLineNumbers,
          })
        );
        if (cappedCount > oldCount) {
          dispatch(setReduxCurrentPage(cappedCount));
        } else if (cappedCount < oldCount && currentPage > cappedCount) {
          dispatch(setReduxCurrentPage(cappedCount));
        }
      }
    },
    [treeItems, selectedTemplate, setEditorContent, editorId, schema, dispatch, currentPage, maxAllowedLines]
  );

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
        total: treeItems.length,
      },
    };
  }, [treeItems, currentPage, itemsPerPage]);

  const enhancedSchemaData: {
    schemaToUse: TemplateField;
    filteredForeignFields: TemplateField[];
  } = useMemo(() => {
    return enhanceSchemaWithForeignPlaceholders(
      selectedTemplate?.originalText || "",
      schema
    );
  }, [
    selectedTemplate?.originalText,
    schema,
    enhanceSchemaWithForeignPlaceholders,
  ]);

  // ========== EFFECTS ==========s

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
    if (selectedTemplate?.originalText) {
      const originalText = selectedTemplate.originalText;
      // Check for countField
      const hasCountField = originalText.includes("{{countField}}");
      setHasCountFieldPlaceholder(hasCountField);

      // Get line numbers from template
      const { lineNumbers, maxLineNumber } = detectAndExtractNumberedLines(originalText);
      setMaxAllowedLines(Math.max(lineNumbers.length, 1));
      dispatch(setTemplateText(originalText));

      // If we have numbered lines with countField, set the count
      if (maxLineNumber > 0 && hasCountField) {
        setCount(maxLineNumber);
      }

      // Enhance schema with any foreign placeholders
      const { schemaToUse } = enhancedSchemaData;

      // Extract values from template
      const extractedValues = extractValuesFromTemplate(
        originalText,
        schemaToUse
      );

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
  }, [schema, dispatch, selectedTemplate?.originalText]);

  /**
   * Ensure template text stays in sync with tree items when switching pages.
   * Only run when the page actually changes.
   */
  useEffect(() => {
    if (prevPageRef.current !== currentPage && selectedTemplate?.originalText) {
      prevPageRef.current = currentPage;

      // Update template on page change to ensure consistency
      setTimeout(() => {
        if (selectedTemplate) {
          // Fix any missing indexed values
          fixTreeItemsIndexing(treeItems, selectedTemplate.text, dispatch);

          const { schemaToUse } = enhancedSchemaData;

          // Update template with the latest values if needed
          const allValues = collectAllTreeItemValues(
            treeItems,
            count,
            schemaToUse
          );

          // Make sure countField is properly set
          allValues.countField = count;

          const updatedTemplate = updateTemplateFromTree(
            selectedTemplate.originalText,
            allValues
          );

          if (updatedTemplate !== selectedTemplate.text) {
            setSelectedTemplate({
              ...selectedTemplate,
              text: updatedTemplate,
            });

            setEditorContent(editorId, updatedTemplate);
          }
        }
      }, 0);
    }
  }, [
    currentPage,
    selectedTemplate?.originalText,
    treeItems,
    dispatch,
    count,
    setEditorContent,
  ]);

  /**
   * Populate the template with initial values once treeItems are set.
   * This effect:
   * 1. Combines all values from tree items with the proper indexing
   * 2. Updates the template text with these values
   * 3. Updates the editor content
   */
  useEffect(() => {
    if (selectedTemplate?.originalText && treeItems.length > 0) {
      // Only run this effect on initial load, not on every treeItems change
      // We use the useEffect for field changes to handle template updates after changes

      // Prepare values for template update, including both indexed and non-indexed
      const currentState = store.getState().tree;
      const latestTreeItems = currentState.treeItems;

      const allValues = collectAllTreeItemValues(
        latestTreeItems,
        count,
        schema
      );

      const initialTemplateText = updateTemplateFromTree(
        selectedTemplate.originalText,
        allValues
      );

      setSelectedTemplate({
        ...selectedTemplate,
        text: initialTemplateText,
      });
      setEditorContent(editorId, initialTemplateText);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedTemplate?.originalText,
    editorId,
    count,
    selectedTemplate?.originalText,
    selectedTemplate?.text,
    treeItems,
  ]);

  /**
   * Ensure tree items have appropriate indexed values
   * Fix specific placeholders that may be missing indexed variants
   */
  useEffect(() => {
    if (treeItems.length > 0 && selectedTemplate?.text) {
      // Identify fields used in the template
      const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
      const templateText = selectedTemplate.originalText;
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

      updatedItems.forEach((item, _index) => {
        const lineNumber = item.lineNumber;
        if (lineNumber > 0) {
          // For each placeholder, ensure both base and indexed values exist
          placeholders.forEach((field) => {
            const indexedField = `${field}_${lineNumber}`;

            // If there's a base value but no indexed value, add it
            if (
              item.values[field] !== undefined &&
              item.values[indexedField] === undefined
            ) {
              // Update the item to add the indexed field
              item.values[indexedField] = item.values[field];
              itemsFixed = true;
            }

            // If there's an indexed value but no base value, add it
            if (
              item.values[indexedField] !== undefined &&
              item.values[field] === undefined
            ) {
              item.values[field] = item.values[indexedField];
              itemsFixed = true;
            }
          });
        }
      });

      // If we fixed any items, update the Redux store
      if (itemsFixed) {
        dispatch(setReduxTreeItems(updatedItems));
      }
    }
  }, [treeItems, selectedTemplate?.originalText, dispatch]);

  // Get currentItems and related pagination data
  const {
    items: currentItems,
    indexOfFirstItem,
    displayInfo,
  } = currentItemsData;

  // ========== RENDER ==========
  return (
    <Box sx={{ p: 1, pt: 0 }}>
      {/* Controls section */}
      <Stack direction="row" spacing={2} sx={{ mb: 1, alignItems: "center" }}>
        {hasCountFieldPlaceholder && (
          <TextField
            label={`Antall ${itemLabel}`}
            type="number"
            value={count}
            onChange={(e) => handleCountChange(parseInt(e.target.value) || 1)}
            slotProps={{ htmlInput: { min: 1, max: maxAllowedLines } }}
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
            schema={enhancedSchema}
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

export default React.memo(DynamicTree);
