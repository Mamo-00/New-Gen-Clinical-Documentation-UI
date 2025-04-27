import React, { useState, useEffect, useMemo, useCallback } from "react";
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

/**
 * Represents a single item in the tree view, containing an ID, line number reference,
 * and a map of field values associated with this item.
 */
interface TreeItem {
  id: number;
  lineNumber: number; // The associated line number in the template
  values: Record<string, FieldValue>;
}

/**
 * Props for the DynamicTree component.
 * @param title - The title displayed at the top of the component
 * @param schema - The schema that defines the structure and fields to render
 * @param initialValues - Default values for fields in the tree
 * @param itemLabel - Label to use for each tree item (default: "item")
 * @param editorId - Identifier for the associated editor
 */
interface DynamicTreeProps {
  title: string;
  schema: TemplateField;
  initialValues: Record<string, FieldValue>;
  itemLabel?: string;
  editorId: string;
}

/**
 * Initializes tree items with appropriate values and line numbers.
 *
 * @param count - Number of items to create
 * @param initialValues - Default values for all fields
 * @param lineNumbers - Optional array of line numbers to assign to items
 * @param schemaId - Optional schema identifier
 * @returns Array of TreeItem objects initialized with values and line numbers
 *
 * This function:
 * 1. Creates an array of TreeItem objects
 * 2. Assigns line numbers from the provided array (or sequential numbers if not provided)
 * 3. Creates a copy of initial values for each item
 * 4. Adds indexed versions of placeholders (e.g., field_1, field_2) based on line numbers
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
 * Processes a template to extract numbered line information.
 * @param template - The template text to analyze
 * @returns Object containing the array of line numbers and the maximum line number
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
 * DynamicTree component handles rendering and managing templated fields with repeatable sections.
 * It synchronizes between a text template with placeholders and a UI for editing values.
 *
 * Key features:
 * - Handles templates with numbered lines (e.g., "1:", "2:")
 * - Allows dynamic addition/removal of items via countField
 * - Provides pagination for navigating multiple items
 * - Syncs template text with UI field values
 */
const DynamicTree: React.FC<DynamicTreeProps> = ({
  title,
  schema,
  initialValues,
  editorId,
  itemLabel = "item",
}) => {
  const { setContent: setEditorContent } = useEditor();
  const { selectedTemplate, setSelectedTemplate } = useTemplate();
  const [sourceTemplate, setSourceTemplate] = useState<string>("");
  //the normal schema but with additional fields that didn't exist in the original schema
  const [enhancedSchema, setEnhancedSchema] = useState<TemplateField>(schema);

  // Get countField from schema with default value of 1
  const defaultCount = schema.countField || 1;

  const [count, setCount] = useState<number>(defaultCount);

  // Track whether the current template contains countField placeholder
  const [hasCountFieldPlaceholder, setHasCountFieldPlaceholder] =
    useState<boolean>(false);
    

  // Initialize treeItems with memoization to avoid recalculation
  const [treeItems, setTreeItems] = useState<TreeItem[]>(() =>
    initializeTreeItems(defaultCount, initialValues)
  );

  // Pagination state - keeps core state while UI logic is in TreePagination.tsx
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(1);
  
  // Add a custom setCurrentPage handler for debugging
  const handlePageChange = useCallback((newPage: number) => {
    console.log(`📄 Page change requested: from ${currentPage} to ${newPage}`);
    console.log(`📄 Current tree items state:`, JSON.stringify(treeItems.map(item => ({
      id: item.id, 
      lineNumber: item.lineNumber,
      valuesCount: Object.keys(item.values).length,
      sampleValues: Object.entries(item.values).slice(0, 2)
    })), null, 2));
    
    setCurrentPage(newPage);
  }, [currentPage, treeItems]);

  /**
   * Calculate the indices for the items to display on the current page.
   * This is memoized to avoid recalculation on every render.
   */
  const currentItemsIndices = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    console.log(`📄 Calculated page indices: firstItem=${indexOfFirstItem}, lastItem=${indexOfLastItem}`);
    return { indexOfFirstItem, indexOfLastItem };
  }, [currentPage, itemsPerPage]);

  /**
   * Get the tree items that should be displayed on the current page.
   * This is memoized to avoid slicing the array on every render.
   */
  const currentItems = useMemo(
    () =>
      treeItems.slice(
        currentItemsIndices.indexOfFirstItem,
        currentItemsIndices.indexOfLastItem
      ),
    [treeItems, currentItemsIndices]
  );

  /**
   * Format the item label with proper capitalization.
   * This is memoized to avoid string manipulation on every render.
   */
  const capitalizedItemLabel = useMemo(
    () => itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1),
    [itemLabel]
  );

  /**
   * Adjust the current page when count changes to ensure it's still valid.
   * For example, if items are removed and the current page is now out of bounds.
   */
  useEffect(() => {
    const totalPages = Math.ceil(treeItems.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [count, treeItems.length, currentPage, itemsPerPage]);

  /**
   * Log template and tree item state after page changes
   * This should help diagnose why template values are being reset
   */
  useEffect(() => {
    console.log(`🔎 PAGE CHANGED: Now on page ${currentPage}`);
    
    // Check active tree item values
    const activeItemIndex = currentItemsIndices.indexOfFirstItem;
    if (activeItemIndex < treeItems.length) {
      const activeItem = treeItems[activeItemIndex];
      console.log(`🔎 Active tree item ${activeItemIndex+1}:`, JSON.stringify({
        id: activeItem.id,
        lineNumber: activeItem.lineNumber,
        values: activeItem.values
      }, null, 2));
    }
    
    // Log current template text to see if it matches our expectations
    if (selectedTemplate) {
      const templateLines = selectedTemplate.text.split('\n');
      console.log(`🔎 Current template state (${templateLines.length} lines):`);
      templateLines.forEach((line, i) => {
        // Only log lines with numbered patterns (e.g., "1:", "2:")
        if (line.match(/^\d+\s*:/)) {
          console.log(`🔎 Line ${i+1}: ${line}`);
        }
      });
    }
    
    // Check if we have all expected indexed values in each tree item
    treeItems.forEach((item, idx) => {
      const lineNumber = item.lineNumber;
      if (lineNumber > 0) {
        // Check a few important fields to see if they have proper indexed versions
        const basicFields = ['measurement', 'blokker'];
        basicFields.forEach(field => {
          const hasField = item.values[field] !== undefined;
          const indexedField = `${field}_${lineNumber}`;
          const hasIndexedField = item.values[indexedField] !== undefined;
          
          if (hasField && !hasIndexedField) {
            console.warn(`⚠️ Tree item ${idx+1} (line ${lineNumber}): Missing indexed value for ${field}`);
          }
          
          if (hasField && hasIndexedField && item.values[field] !== item.values[indexedField]) {
            console.warn(`⚠️ Tree item ${idx+1} (line ${lineNumber}): Value mismatch between ${field}=${item.values[field]} and ${indexedField}=${item.values[indexedField]}`);
          }
        });
      }
    });
  }, [currentPage, treeItems, selectedTemplate, currentItemsIndices]);

  /**
   * Calculate display information for pagination, showing which items
   * are currently visible out of the total.
   */
  const displayInfo = useMemo(
    () => ({
      start: currentItemsIndices.indexOfFirstItem + 1,
      end: Math.min(currentItemsIndices.indexOfLastItem, treeItems.length),
      total: treeItems.length,
    }),
    [currentItemsIndices, treeItems.length]
  );

  /**
   * Determines if pagination controls should be displayed.
   * Only show pagination when the template has a countField placeholder and multiple items.
   */
  const shouldShowPagination = useMemo(
    () => hasCountFieldPlaceholder && treeItems.length > 1,
    [hasCountFieldPlaceholder, treeItems.length]
  );

  /**
   * Initialize the component when a template is loaded.
   * This effect:
   * 1. Saves the original template text
   * 2. Checks for countField placeholder
   * 3. Extracts placeholders, line numbers, and values
   * 4. Enhances the schema if needed
   * 5. Initializes tree items with values and line numbers
   *
   * It calls:
   * - extractPlaceholdersFromTemplate
   * - extractNumberedLines
   * - flattenSchema
   * - detectNumberedLines
   * - extractValuesFromTemplate
   * - generateSchemaFromTemplate
   * - initializeTreeItems
   */
  useEffect(() => {
    if (selectedTemplate) {
      const originalText = selectedTemplate.text;

      // Check for countField
      const hasCountField = originalText.includes("{{countField}}");

      // Extract all placeholders from the template
      const allPlaceholders = extractPlaceholdersFromTemplate(originalText);

      // Get the numbered lines from the template
      const { lineNumbers, maxLineNumber } =
        detectAndExtractNumberedLines(originalText);

      // Check if we have placeholders not in the schema
      const flattenedSchema = flattenSchema(schema);

      const schemaFields = Object.keys(flattenedSchema);

      // Get number of lines that follow the pattern "n:" from the template
      const linesCount = maxLineNumber;

      if (linesCount > 0 && hasCountField) {
        // If we have numbered lines, set the count to match
        setCount(linesCount);
      }

      setSourceTemplate(originalText);

      setHasCountFieldPlaceholder(hasCountField);

      // Filter out countField from placeholders when deciding on "foreign" placeholders
      const hasForeignPlaceholders = allPlaceholders
        .filter((p) => p !== "countField") // Exclude countField from consideration
        .some((p) => !schemaFields.includes(p));

      // Create the appropriate schema immediately (instead of just setting state)
      let schemaToUse = schema;
      
      if (hasForeignPlaceholders) {
        // Use the generateSchemaFromTemplate function to create a schema from placeholders
        const placeholderSchema = generateSchemaFromTemplate(originalText);

        // Hybrid approach - keep original schema structure but add foreign placeholders section
        const foreignFields =
          placeholderSchema.children?.flatMap(
            (container) => container.children || []
          ) || [];

        // Filter out countField from the foreign fields to avoid duplicate UI elements
        const filteredForeignFields = foreignFields.filter(
          (field) =>
            !schemaFields.includes(field.id) && field.id !== "countField"
        );

        // Create the enhanced schema inline
        schemaToUse = {
          ...schema,
          children: [
            ...(schema.children || []),
            filteredForeignFields.length > 0
              ? {
                  id: "foreignFields",
                  type: "container",
                  label: "Additional Fields",
                  layout: "vertical",
                  children: filteredForeignFields,
                }
              : null,
          ].filter(Boolean) as TemplateField[], // Filter out null entries
        };
        
        // Now update the enhancedSchema state (for other parts of the component to use)
        setEnhancedSchema(schemaToUse);
      } else {
        // No foreign placeholders, use original schema
        setEnhancedSchema(schema);
      }
      
      // Extract values using the inline-created schema (which already has foreign fields)
      const extractedValues = extractValuesFromTemplate(originalText, schemaToUse);

      // Remove countField from extracted values to avoid duplicate UI
      if (extractedValues.countField !== undefined) {
        // If countField is present in extracted values, use it to update the count state
        const countValue = Number(extractedValues.countField);
        if (!isNaN(countValue) && countValue > 0) {
          setCount(countValue);
        }
        // Remove countField from extracted values to avoid duplicate UI
        delete extractedValues.countField;
      }

      // Initialize tree items with line numbers from the template
      setTreeItems(
        initializeTreeItems(
          Math.max(lineNumbers.length, 1), // At least one item
          extractedValues,
          lineNumbers,
        )
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  /**
   * Populate the template with initial values once sourceTemplate and treeItems are set.
   * This effect:
   * 1. Combines all values from tree items with the proper indexing
   * 2. Updates the template text with these values
   * 3. Updates the editor content
   *
   * It calls:
   * - updateTemplateFromTree
   * - setSelectedTemplate
   * - setEditorContent
   */
  useEffect(() => {
    if (selectedTemplate && sourceTemplate && treeItems.length > 0) {
      // Important: We're updating the template text, but we've already saved
      // the information about whether it originally had countField placeholders

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTemplate]);

  /**
   * Handles changes to field values in the UI.
   * This function:
   * 1. Updates the specific field value in the tree item
   * 2. Creates indexed versions of the value based on line number
   * 3. Collects all values from all tree items
   * 4. Updates the template text with these values
   * 5. Updates the editor content and tree items state
   *
   * It calls:
   * - updateTemplateFromTree
   * - setSelectedTemplate
   * - setEditorContent
   * - setTreeItems
   */
  const handleFieldChange = useCallback(
    (itemIndex: number, fieldId: string, value: FieldValue) => {
      console.log(`🔄 handleFieldChange START: itemIndex=${itemIndex}, fieldId=${fieldId}, value=${JSON.stringify(value)}`);
      
      // Get the tree item and its line number
      const treeItem = treeItems[itemIndex];
      if (!treeItem) {
        console.error(`🔄 No tree item found at index ${itemIndex}`);
        return;
      }

      const lineNumber = treeItem.lineNumber;
      
      // 1. Create updated item values
      const updatedItemValues = JSON.parse(JSON.stringify(treeItem.values));
      updatedItemValues[fieldId] = value;
      
      // Update indexed version if needed
      if (lineNumber > 0 && !fieldId.includes("_")) {
        const indexedKey = `${fieldId}_${lineNumber}`;
        updatedItemValues[indexedKey] = value;
      }
      
      // 2. Create a new copy of all tree items with the updated item
      const newTreeItems = [...treeItems];
      newTreeItems[itemIndex] = {
        ...newTreeItems[itemIndex],
        values: updatedItemValues,
      };
      
      // 3. Build template values from complete set of items
      const templateValues: Record<string, FieldValue> = { countField: count };
      
      // Add values from ALL tree items, including the updated one
      newTreeItems.forEach((item) => {
        Object.entries(item.values).forEach(([key, val]) => {
          templateValues[key] = val;
        });
      });
      
      // 4. Update the template
      if (sourceTemplate && selectedTemplate) {
        const updatedTemplate = updateTemplateFromTree(
          sourceTemplate,
          templateValues
        );
        
        setSelectedTemplate({
          text: updatedTemplate,
          category: selectedTemplate.category,
        });
        
        setEditorContent(editorId, updatedTemplate);
      }
      
      // 5. Update tree items state
      setTreeItems(newTreeItems);
    },
    [treeItems, count, sourceTemplate, selectedTemplate, setSelectedTemplate, setEditorContent, editorId]
  );

  /**
   * Adjusts the template text when count changes.
   * This function:
   * 1. Detects line patterns like "1:", "2:" in the template
   * 2. Adds or removes lines based on the new count
   * 3. Ensures placeholder values are preserved
   *
   * It handles:
   * - Adding new lines with placeholders when count increases
   * - Removing excess lines when count decreases
   * - Cleaning up template formatting
   * - Setting up indexed values for all placeholders
   */
  const adjustTemplateForCount = useCallback(
    (
      template: string,
      newCount: number,
      initialValues: Record<string, FieldValue>
    ): string => {
      console.log(`⚡ adjustTemplateForCount STARTED: newCount=${newCount}`);
      console.log(`⚡ Initial template: ${template.substring(0, 100)}...`);
      console.log(`⚡ Initial values: ${JSON.stringify(initialValues, null, 2).substring(0, 200)}...`);
      
      // Detect line format like "1: text", "2: text"
      const linePattern = /(^\d+\s*:.+$)/gm;
      const lines = template.match(linePattern);

      console.log(`⚡ Detected ${lines?.length || 0} numbered lines in template`);
      
      if (!lines) {
        console.log('⚡ No numbered lines found, returning original template');
        return template;
      }

      // Extract the line number and content for each match
      const parsedLines = lines
        .map((line) => {
          const match = line.match(/^(\d+)\s*:(.*?)$/);
          return match ? { num: parseInt(match[1]), text: match[2] } : null;
        })
        .filter(Boolean);

      console.log(`⚡ Parsed ${parsedLines.length} valid lines`);
      parsedLines.forEach((line, idx) => {
        if (idx < 5) { // Limit logging to first 5 for brevity
          console.log(`⚡ Line ${idx+1}: num=${line?.num}, text="${line?.text?.substring(0, 30)}..."`);
        }
      });

      // If we have parsed lines, adjust them based on newCount
      if (parsedLines.length > 0) {
        let result = template;

        // Find the highest existing line number
        const maxLine = Math.max(...parsedLines.map((l) => l!.num));
        console.log(`⚡ Highest line number: ${maxLine}`);

        // If newCount > maxLine, add new lines
        if (newCount > maxLine) {
          console.log(`⚡ Need to ADD lines: current max=${maxLine}, new count=${newCount}`);
          
          // Find a model line to use as template
          const modelLine = parsedLines.find((l) => l!.num === maxLine);
          console.log(`⚡ Using model line: ${JSON.stringify(modelLine)}`);
          
          if (modelLine) {
            // Process existing text to ensure all placeholders have defined values in all lines
            const initialValuesClone = {...initialValues};
            
            for (let i = 1; i <= maxLine; i++) {
              // For each placeholder, ensure it has a corresponding indexed value
              Object.keys(initialValues).forEach((key) => {
                const indexedKey = `${key}_${i}`;
                // We set up the indexed values but don't modify the template yet
                if (initialValues[key] !== undefined) {
                  initialValuesClone[indexedKey] = initialValues[key];
                }
              });
            }
            
            console.log(`⚡ Updated initialValues with indexed values for existing lines`);
            console.log(`⚡ Keys count before: ${Object.keys(initialValues).length}, after: ${Object.keys(initialValuesClone).length}`);
            
            // Log a sample of indexed keys
            const sampleKeys = Object.keys(initialValuesClone)
              .filter(k => k.includes('_'))
              .slice(0, 5);
            console.log(`⚡ Sample indexed keys: ${JSON.stringify(sampleKeys)}`);

            // Add new lines using the model line's format
            for (let i = maxLine + 1; i <= newCount; i++) {
              // Append new line with increasing number
              const newLineText = `\n${i}:${modelLine.text}`;
              result += newLineText;
              console.log(`⚡ Added new line ${i}: "${newLineText.substring(0, 30)}..."`);

              // For each placeholder in the model line, create indexed values
              const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
              let match;
              let placeholdersFound = 0;
              while ((match = placeholderRegex.exec(modelLine.text)) !== null) {
                placeholdersFound++;
                const placeholder = match[1].trim();
                const indexedKey = `${placeholder}_${i}`;
                // Set up indexed values for new lines
                if (initialValues[placeholder] !== undefined) {
                  initialValuesClone[indexedKey] = initialValues[placeholder];
                  console.log(`⚡ Created indexed value: ${indexedKey}=${initialValues[placeholder]}`);
                }
              }
              console.log(`⚡ Found ${placeholdersFound} placeholders in model line`);
            }
            
            // Copy back all values to the original object
            Object.keys(initialValuesClone).forEach(key => {
              initialValues[key] = initialValuesClone[key];
            });
          }
        }
        // If newCount < maxLine, remove excess lines
        else if (newCount < maxLine) {
          console.log(`⚡ Need to REMOVE lines: current max=${maxLine}, new count=${newCount}`);
          
          // Find all lines with numbers > newCount
          for (let i = newCount + 1; i <= maxLine; i++) {
            // Create a regex that matches the entire line with this number
            const lineRegex = new RegExp(`^${i}\\s*:.*$`, "gm");
            const beforeLength = result.length;
            
            // Remove the line
            result = result.replace(lineRegex, "");
            
            const afterLength = result.length;
            console.log(`⚡ Removed line ${i}: chars removed=${beforeLength - afterLength}`);

            // Also clean up any indexed values for removed lines
            const keysToRemove = Object.keys(initialValues)
              .filter((key) => key.endsWith(`_${i}`));
              
            console.log(`⚡ Removing ${keysToRemove.length} indexed values for line ${i}`);
            keysToRemove.forEach((key) => {
              delete initialValues[key];
              console.log(`⚡ Deleted key: ${key}`);
            });
          }

          // Clean up any consecutive newlines resulting from removal
          const beforeCleanup = result.length;
          result = result.replace(/\n\s*\n/g, "\n");
          const afterCleanup = result.length;
          console.log(`⚡ Cleaned up consecutive newlines: removed ${beforeCleanup - afterCleanup} chars`);
        }

        console.log(`⚡ Final template length: ${result.length} chars`);
        console.log(`⚡ Final initialValues keys count: ${Object.keys(initialValues).length}`);
        
        return result;
      }

      console.log('⚡ No valid parsed lines, returning original template');
      return template;
    },
    []
  );

  /**
   * Handles changes to the count field (number of items).
   * This function:
   * 1. Updates the count state
   * 2. Updates the template if it has countField placeholder
   * 3. Creates new tree items based on the updated count
   *
   * It calls:
   * - updateTemplateFromTree
   * - extractNumberedLines
   * - initializeTreeItems
   * - setSelectedTemplate
   * - setEditorContent
   * - setTreeItems
   */
  const handleCountChange = useCallback(
    (newCount: number) => {
      console.log(`🔥 handleCountChange STARTED: newCount=${newCount}`);
      
      if (newCount < 1) {
        console.log(`🔥 Invalid count (${newCount}), ignoring`);
        return;
      }

      console.log(`🔥 Setting count state from ${count} to ${newCount}`);
      setCount(newCount);

      // Handle template updates for any template with countField placeholder
      console.log(`🔥 hasCountFieldPlaceholder=${hasCountFieldPlaceholder}, selectedTemplate exists=${!!selectedTemplate}, sourceTemplate exists=${!!sourceTemplate}`);
      
      if (hasCountFieldPlaceholder && selectedTemplate && sourceTemplate) {
        console.log(`🔥 Template needs updating: ${sourceTemplate.substring(0, 100)}...`);
        
        // Create a working copy of all current values
        const allValues: Record<string, FieldValue> = {
          countField: newCount,
        };
        console.log(`🔥 Starting with allValues: ${JSON.stringify(allValues)}`);

        // Get all current values from tree items
        console.log(`🔥 Processing ${treeItems.length} tree items`);
        
        treeItems.forEach((item, itemIdx) => {
          const lineNumber = item.lineNumber;
          console.log(`🔥 Processing item ${itemIdx+1}, line=${lineNumber}, with ${Object.keys(item.values).length} values`);

          Object.entries(item.values).forEach(([key, value], entryIdx) => {
            // Only log first few entries per item to avoid console spam
            const shouldLog = entryIdx < 3;
            
            // Store both indexed and non-indexed versions properly
            if (key.includes("_") && Number(key.split("_").pop()) > 0) {
              // Keep indexed values as is
              allValues[key] = value;
              if (shouldLog) console.log(`🔥 Keeping indexed value: ${key}=${value}`);
            } else {
              // Store plain keys
              allValues[key] = value;
              if (shouldLog) console.log(`🔥 Setting plain key: ${key}=${value}`);

              // Also create indexed versions for numbered lines
              if (lineNumber > 0) {
                const indexedKey = `${key}_${lineNumber}`;
                allValues[indexedKey] = value;
                if (shouldLog) console.log(`🔥 Adding indexed key: ${indexedKey}=${value}`);
              }
            }
          });
        });

        console.log(`🔥 Collected ${Object.keys(allValues).length} total values`);
        console.log(`🔥 Sample keys: ${JSON.stringify(Object.keys(allValues).slice(0, 5))}`);

        // First adjust the template structure based on the new count
        console.log(`🔥 Calling adjustTemplateForCount with newCount=${newCount}`);
        const adjustedTemplate = adjustTemplateForCount(
          sourceTemplate,
          newCount,
          allValues
        );
        console.log(`🔥 Got adjustedTemplate, length: ${adjustedTemplate.length} chars`);
        console.log(`🔥 adjustedTemplate: ${adjustedTemplate.substring(0, 100)}...`);

        // Then apply all values to the adjusted template
        console.log(`🔥 Calling updateTemplateFromTree with ${Object.keys(allValues).length} values`);
        const updatedTemplate = updateTemplateFromTree(
          adjustedTemplate,
          allValues
        );
        console.log(`🔥 Got updatedTemplate, length: ${updatedTemplate.length} chars`);
        console.log(`🔥 updatedTemplate: ${updatedTemplate.substring(0, 100)}...`);

        // Get the new line numbers from the updated template
        console.log(`🔥 Detecting line numbers in updated template`);
        const { lineNumbers: updatedLineNumbers } =
          detectAndExtractNumberedLines(updatedTemplate);
        console.log(`🔥 Detected ${updatedLineNumbers.length} line numbers: ${JSON.stringify(updatedLineNumbers.slice(0, 10))}`);

        // Create new tree items based on the updated template
        console.log(`🔥 Initializing new tree items with count=${newCount}, lineNumbers count=${updatedLineNumbers.length}`);
        const newTreeItems = initializeTreeItems(
          newCount,
          allValues,
          updatedLineNumbers
        );
        console.log(`🔥 Created ${newTreeItems.length} new tree items`);
        
        // Log a sample tree item
        if (newTreeItems.length > 0) {
          const sampleItem = newTreeItems[0];
          console.log(`🔥 Sample tree item: id=${sampleItem.id}, lineNumber=${sampleItem.lineNumber}, values count=${Object.keys(sampleItem.values).length}`);
        }

        // Use direct assignment since the context doesn't accept callbacks
        console.log(`🔥 Updating selectedTemplate state`);
        if (selectedTemplate) {
          setSelectedTemplate({
            text: updatedTemplate,
            category: selectedTemplate.category,
          });
        }

        console.log(`🔥 Updating editor content with ${updatedTemplate.length} chars`);
        setEditorContent(editorId, updatedTemplate);

        // Update tree items state
        console.log(`🔥 Updating treeItems state with ${newTreeItems.length} items`);
        setTreeItems(newTreeItems);
        
        console.log(`🔥 handleCountChange COMPLETED`);
      }
    },
    [
      treeItems, 
      count,
      hasCountFieldPlaceholder,
      selectedTemplate,
      sourceTemplate,
      editorId,
      adjustTemplateForCount,
      setSelectedTemplate,
      setEditorContent
    ]
  );

  /**
   * Creates a filtered version of the schema that excludes countField.
   * This prevents duplicate UI elements since countField is handled separately.
   *
   * This function recursively processes the schema tree, marking countField nodes
   * for exclusion and filtering them out from the final schema.
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

  /**
   * Creates a memoized render function for TreeRenderer to avoid recreating it on every render.
   * This function:
   * 1. Takes a tree item and its index
   * 2. Returns a TreeRenderer component with appropriate props
   * 3. Connects field changes to the handleFieldChange callback
   */
  const renderTreeRenderer = useCallback(
    (item: TreeItem, index: number) => {
      return (
        <TreeRenderer
          schema={filteredSchema}
          values={item.values}
          onChange={(fieldId, value) =>
            handleFieldChange(index, fieldId, value)
          }
        />
      );
    },
    [filteredSchema, handleFieldChange]
  );

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, textTransform: "capitalize" }}>
        {title}
      </Typography>
      {/* Controls */}
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

      {/* Use the new TreePagination component if we should show pagination */}
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
                label={`${
                  currentItemsIndices.indexOfFirstItem + index + 1
                } av ${treeItems.length}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>

          {renderTreeRenderer(
            item,
            currentItemsIndices.indexOfFirstItem + index
          )}
        </Box>
      ))}

      {/* Show bottom pagination if needed */}
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
