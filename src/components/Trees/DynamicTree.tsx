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
  editorId,
  itemLabel = "item",
}) => {
  const dispatch = useAppDispatch();
  const { treeItems, currentPage } = useAppSelector((state) => state.tree);
  const itemsPerPage = 1; // Fixed at 1 item per page

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

  // Initialize Redux store with editorId
  useEffect(() => {
    dispatch(setReduxEditorId(editorId));
  }, [dispatch, editorId]);

  // Add a custom setCurrentPage handler for debugging
  const handlePageChange = useCallback(
    (newPage: number) => {
      console.log(
        `📄 Page change requested: from ${currentPage} to ${newPage}`
      );
      console.log(
        `📄 Current tree items state:`,
        JSON.stringify(
          treeItems.map((item) => ({
            id: item.id,
            lineNumber: item.lineNumber,
            valuesCount: Object.keys(item.values).length,
            sampleValues: Object.entries(item.values).slice(0, 2),
          })),
          null,
          2
        )
      );

      dispatch(setReduxCurrentPage(newPage));
    },
    [currentPage, treeItems, dispatch]
  );

  /**
   * Calculate the indices for the items to display on the current page.
   * This is memoized to avoid recalculation on every render.
   */
  const currentItemsIndices = useMemo(() => {
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    console.log(
      `📄 Calculated page indices: firstItem=${indexOfFirstItem}, lastItem=${indexOfLastItem}`
    );
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
   * Monitor tree item changes to ensure proper pagination
   */
  useEffect(() => {
    const totalPages = Math.ceil(treeItems.length / itemsPerPage);
    console.log(
      `🔍 Tree items changed: count=${treeItems.length}, current page=${currentPage}, total pages=${totalPages}`
    );

    // Ensure current page is still valid
    if (currentPage > totalPages && totalPages > 0) {
      console.log(
        `🔍 Adjusting current page from ${currentPage} to ${totalPages}`
      );
      dispatch(setReduxCurrentPage(totalPages));
    } else if (treeItems.length === 0 && currentPage > 1) {
      console.log(`🔍 No items, resetting to page 1`);
      dispatch(setReduxCurrentPage(1));
    }

    // When count changes dynamically, make sure editor and template are updated
    if (selectedTemplate && sourceTemplate && treeItems.length > 0) {
      // Only update if count differs from previous render
      if (count !== treeItems.length) {
        console.log(
          `🔍 Count changed from UI: ${count}, actual items: ${treeItems.length}, updating count state`
        );
        setCount(treeItems.length);
      }
    }
  }, [
    treeItems.length,
    currentPage,
    itemsPerPage,
    dispatch,
    count,
    selectedTemplate,
    sourceTemplate,
  ]);

  // Original effect that adjusts current page when count changes
  useEffect(() => {
    const totalPages = Math.ceil(treeItems.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      dispatch(setReduxCurrentPage(totalPages));
    }
  }, [count, treeItems.length, currentPage, itemsPerPage, dispatch]);

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
      console.log(
        `🔎 Active tree item ${activeItemIndex + 1}:`,
        JSON.stringify(
          {
            id: activeItem.id,
            lineNumber: activeItem.lineNumber,
            values: activeItem.values,
          },
          null,
          2
        )
      );
    }

    // Log current template text to see if it matches our expectations
    if (selectedTemplate) {
      const templateLines = selectedTemplate.text.split("\n");
      console.log(`🔎 Current template state (${templateLines.length} lines):`);
      templateLines.forEach((line, i) => {
        // Only log lines with numbered patterns (e.g., "1:", "2:")
        if (line.match(/^\d+\s*:/)) {
          console.log(`🔎 Line ${i + 1}: ${line}`);
        }
      });
    }

    // Check if we have all expected indexed values in each tree item
    treeItems.forEach((item, idx) => {
      const lineNumber = item.lineNumber;
      if (lineNumber > 0) {
        // Extract field names dynamically from the template instead of hardcoded fields
        const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
        const templateText = selectedTemplate?.text || "";
        const allPlaceholders = new Set<string>();
        let match;

        // Find all placeholders in the template
        while ((match = placeholderPattern.exec(templateText)) !== null) {
          const placeholder = match[1].trim();
          if (placeholder !== "countField") {
            allPlaceholders.add(placeholder);
          }
        }

        // Check for missing indexed values for fields found in template
        allPlaceholders.forEach((field) => {
          const hasField = item.values[field] !== undefined;
          const indexedField = `${field}_${lineNumber}`;
          const hasIndexedField = item.values[indexedField] !== undefined;

          if (hasField && !hasIndexedField) {
            console.warn(
              `⚠️ Tree item ${
                idx + 1
              } (line ${lineNumber}): Missing indexed value for ${field}`
            );
          }

          if (
            hasField &&
            hasIndexedField &&
            item.values[field] !== item.values[indexedField]
          ) {
            console.warn(
              `⚠️ Tree item ${
                idx + 1
              } (line ${lineNumber}): Value mismatch between ${field}=${
                item.values[field]
              } and ${indexedField}=${item.values[indexedField]}`
            );
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
   */
  useEffect(() => {
    if (selectedTemplate) {
      const originalText = selectedTemplate.text;

      // Check for countField
      const hasCountField = originalText.includes("{{countField}}");
      setHasCountFieldPlaceholder(hasCountField);

      // Get the numbered lines from the template
      const { lineNumbers, maxLineNumber } =
        detectAndExtractNumberedLines(originalText);

      setSourceTemplate(originalText);
      dispatch(setTemplateText(originalText));

      // If we have numbered lines with countField, set the count
      if (maxLineNumber > 0 && hasCountField) {
        setCount(maxLineNumber);
      }

      // Extract all placeholders from the template
      const allPlaceholders = extractPlaceholdersFromTemplate(originalText);

      // Check if we have placeholders not in the schema
      const flattenedSchema = flattenSchema(schema);

      const schemaFields = Object.keys(flattenedSchema);

      // Filter out countField from placeholders when deciding on "foreign" placeholders
      const hasForeignPlaceholders = allPlaceholders
        .filter((p) => p !== "countField") // Exclude countField from consideration
        .some((p) => !schemaFields.includes(p));

      let schemaToUse: TemplateField = schema;
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

        if (filteredForeignFields.length > 0) {
          const foreignFieldsContainer: TemplateField = {
            id: "foreignFields",
            type: "container",
            label: "Additional Fields",
            layout: "vertical",
            children: filteredForeignFields,
          };
          schemaToUse = {
            ...schema,
            children: [...(schema.children || []), foreignFieldsContainer], 
          };
          setEnhancedSchema(schemaToUse);
        }
        
      } else {
        // No foreign placeholders, use original schema
        setEnhancedSchema(schema);
      }
      console.log("schemaToUse:", schemaToUse);
      console.log("enhancedSchema: ", enhancedSchema);
      

      // Extract values using the inline-created schema (which already has foreign fields)
      const extractedValues = extractValuesFromTemplate(
        originalText,
        schemaToUse
      );

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

      // Initialize tree items with line numbers from the template and store in Redux
      const newTreeItems = initializeTreeItems(
        Math.max(lineNumbers.length, 1), // At least one item
        extractedValues,
        lineNumbers
      );

      dispatch(setReduxTreeItems(newTreeItems));
    }
  }, [schema, dispatch]);

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
   * Handles changes to field values in the UI.
   * Now uses Redux to update state.
   */
  const handleFieldChange = useCallback(
    (itemIndex: number, fieldId: string, value: FieldValue) => {
      console.log(
        `🔄 handleFieldChange START: itemIndex=${itemIndex}, fieldId=${fieldId}, value=${JSON.stringify(
          value
        )}`
      );

      // Get the tree item and its line number
      const treeItem = treeItems[itemIndex];
      if (!treeItem) {
        console.error(`🔄 No tree item found at index ${itemIndex}`);
        return;
      }

      const lineNumber = treeItem.lineNumber;
      console.log(`🔄 Item line number: ${lineNumber}`);

      // Check if the value is actually different from the current value
      const currentValue = treeItem.values[fieldId];
      console.log(
        `🔄 Current value: ${JSON.stringify(
          currentValue
        )}, New value: ${JSON.stringify(value)}`
      );

      if (currentValue === value) {
        console.log(`🔄 Value hasn't changed, skipping update`);
        return;
      }

      // First dispatch the Redux action to update state
      dispatch(
        updateTreeItemValue({
          itemIndex,
          fieldId,
          value,
          lineNumber,
        })
      );

      // Use a more reliable approach to get the latest state after the Redux update
      setTimeout(() => {
        if (sourceTemplate && selectedTemplate) {
          // Get the most current state from Redux - important for consistency!
          const currentState = store.getState().tree;
          const latestTreeItems = currentState.treeItems;

          // Create a fresh allValues object with the latest state
          const allValues: Record<string, FieldValue> = { countField: count };

          // Process all tree items to get their current values
          latestTreeItems.forEach((item: TreeItem) => {
            // Get the line number for this item
            const itemLineNumber = item.lineNumber;

            // Process all values in this item to ensure both regular and indexed versions are included
            Object.entries(item.values).forEach(([key, val]) => {
              // Always include non-indexed values
              if (!key.includes("_")) {
                allValues[key] = val as FieldValue;
              }

              // And always include indexed values specific to this line
              if (key.includes(`_${itemLineNumber}`)) {
                allValues[key] = val as FieldValue;
              }

              // Log to diagnose what values we're using (for debugging)
              if (key === fieldId || key.startsWith(fieldId + "_")) {
                console.log(`🔍 Using ${key}=${val} for template update`);
              }
            });
          });

          console.log(
            `🔄 Updating template with values for lines 1-${latestTreeItems.length}`
          );
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

          console.log(`🔄 Template updated with latest Redux state`);
        } else {
          console.warn(
            "Cannot update template - sourceTemplate or selectedTemplate is missing"
          );
        }
      }, 0); // Use minimal timeout to ensure state is updated

      console.log(`🔄 handleFieldChange COMPLETE`);
    },
    [
      treeItems,
      sourceTemplate,
      selectedTemplate,
      setSelectedTemplate,
      setEditorContent,
      editorId,
      count,
      dispatch,
    ]
  );

  /**
   * Adjusts the template text when count changes.
   * This function:
   * 1. Detects line format like "1: text", "2: text"
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

      // Clean up initialValues to avoid duplicates
      const cleanedValues: Record<string, FieldValue> = {};

      // First, copy all non-indexed fields
      Object.keys(initialValues).forEach((key) => {
        if (!key.includes("_")) {
          cleanedValues[key] = initialValues[key];
        }
      });

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
      const lines = template.match(linePattern);

      console.log(
        `⚡ Detected ${lines?.length || 0} numbered lines in template`
      );

      if (!lines) {
        console.log("⚡ No numbered lines found, returning original template");
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
        if (idx < 5) {
          // Limit logging to first 5 for brevity
          console.log(
            `⚡ Line ${idx + 1}: num=${
              line?.num
            }, text="${line?.text?.substring(0, 30)}..."`
          );
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
          console.log(
            `⚡ Need to ADD lines: current max=${maxLine}, new count=${newCount}`
          );

          // Use first line as model instead of last line - better format consistency
          const modelLine =
            parsedLines.find((l) => l!.num === 1) || parsedLines[0];
          console.log(`⚡ Using model line: ${JSON.stringify(modelLine)}`);

          if (modelLine) {
            // Add new lines using the model line's format
            for (let i = maxLine + 1; i <= newCount; i++) {
              // Append new line with increasing number but with clean format
              const newLineText = `\n${i}:${modelLine.text}`;
              result += newLineText;
              console.log(
                `⚡ Added new line ${i}: "${newLineText.substring(0, 30)}..."`
              );

              // Extract placeholders from the model line
              const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
              let match;
              let placeholdersFound = 0;

              // Create a copy of the string for regex (to avoid regex state issues)
              const textToSearch = String(modelLine.text);
              while ((match = placeholderRegex.exec(textToSearch)) !== null) {
                placeholdersFound++;
                const placeholder = match[1].trim();

                // Skip countField as it's handled separately
                if (placeholder === "countField") continue;

                // IMPORTANT: We don't need to set values here anymore
                // The values are already pre-populated in initialValues from handleCountChange
                // We're just logging what placeholders we found
                console.log(
                  `⚡ Found placeholder: {{${placeholder}}} in new line ${i}`
                );
              }
              console.log(
                `⚡ Found ${placeholdersFound} placeholders in model line`
              );
            }
          }
        }
        // If newCount < maxLine, remove excess lines
        else if (newCount < maxLine) {
          console.log(
            `⚡ Need to REMOVE lines: current max=${maxLine}, new count=${newCount}`
          );

          // Find all lines with numbers > newCount
          for (let i = newCount + 1; i <= maxLine; i++) {
            // Create a regex that matches the entire line with this number
            const lineRegex = new RegExp(`^${i}\\s*:.*$`, "gm");
            const beforeLength = result.length;

            // Remove the line
            result = result.replace(lineRegex, "");

            const afterLength = result.length;
            console.log(
              `⚡ Removed line ${i}: chars removed=${
                beforeLength - afterLength
              }`
            );

            // Also remove any indexed values for removed lines
            const keysToRemove = Object.keys(initialValues).filter((key) =>
              key.includes(`_${i}`)
            );

            console.log(
              `⚡ Removing ${keysToRemove.length} indexed values for line ${i}`
            );
            keysToRemove.forEach((key) => {
              delete initialValues[key];
              delete cleanedValues[key];
              console.log(`⚡ Deleted key: ${key}`);
            });
          }

          // Clean up any consecutive newlines resulting from removal
          const beforeCleanup = result.length;
          result = result.replace(/\n\s*\n/g, "\n");
          const afterCleanup = result.length;
          console.log(
            `⚡ Cleaned up consecutive newlines: removed ${
              beforeCleanup - afterCleanup
            } chars`
          );
        }

        // Copy cleaned values back to initialValues
        Object.keys(initialValues).forEach((key) => delete initialValues[key]);
        Object.entries(cleanedValues).forEach(([key, value]) => {
          initialValues[key] = value;
        });

        console.log(`⚡ Final template length: ${result.length} chars`);
        console.log(
          `⚡ Final initialValues keys count: ${
            Object.keys(initialValues).length
          }`
        );

        return result;
      }

      console.log("⚡ No valid parsed lines, returning original template");
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
   * 4. Navigates to the newly added line or adjusts page when removing lines
   */
  const handleCountChange = useCallback(
    (newCount: number) => {
      console.log(`🔥 handleCountChange STARTED: newCount=${newCount}`);

      if (newCount < 1) {
        console.log(`🔥 Invalid count (${newCount}), ignoring`);
        return;
      }

      // Store current count to determine if we're adding or removing lines
      const oldCount = count;

      console.log(`🔥 Setting count state from ${count} to ${newCount}`);
      setCount(newCount);

      // Handle template updates for any template with countField placeholder
      console.log(
        `🔥 hasCountFieldPlaceholder=${hasCountFieldPlaceholder}, selectedTemplate exists=${!!selectedTemplate}, sourceTemplate exists=${!!sourceTemplate}`
      );

      if (hasCountFieldPlaceholder && selectedTemplate && sourceTemplate) {
        // IMPORTANT: Use selectedTemplate text (current state) instead of sourceTemplate
        const currentTemplateText = selectedTemplate.text;
        console.log(
          `🔥 Using current template as base: ${currentTemplateText.substring(
            0,
            100
          )}...`
        );

        // Start with a minimal set of values: just the countField
        const baseValues: Record<string, FieldValue> = {
          countField: newCount,
        };
        console.log(
          `🔥 Starting with baseValues: ${JSON.stringify(baseValues)}`
        );

        // Extract the schema's initial values to use for new lines
        const schemaInitialValues: Record<string, FieldValue> = {};
        const collectInitialValues = (node: TemplateField) => {
          if (node.id && node.defaultValue !== undefined) {
            schemaInitialValues[node.id] = node.defaultValue;
            console.log(
              `🔥 Found schema default value for ${node.id}: ${node.defaultValue}`
            );
          }
          if (node.children) {
            node.children.forEach(collectInitialValues);
          }
        };
        collectInitialValues(schema);
        console.log(
          `🔥 Collected initial values from schema: ${JSON.stringify(
            schemaInitialValues
          )}`
        );

        // Create clean all values object with schema defaults first
        const allValues: Record<string, FieldValue> = {
          ...baseValues,
          ...schemaInitialValues,
        };

        // Detect existing numbered lines to determine what we're adding
        const linePattern = /^(\d+)\s*:/gm;
        const lineMatches = Array.from(
          currentTemplateText.matchAll(linePattern)
        );
        const existingLineNumbers = lineMatches.map((match) =>
          parseInt(match[1])
        );
        const maxExistingLine =
          existingLineNumbers.length > 0 ? Math.max(...existingLineNumbers) : 0;

        console.log(
          `🔥 Found ${existingLineNumbers.length} numbered lines, max line number: ${maxExistingLine}`
        );
        console.log(
          `🔥 Will need to add lines ${maxExistingLine + 1} to ${newCount}`
        );

        // We only need values from existing tree items for lines that will remain
        console.log(
          `🔥 Processing ${treeItems.length} tree items for existing values`
        );

        // First, collect all non-indexed values from all items
        treeItems.forEach((item, _itemIdx) => {
          Object.entries(item.values).forEach(([key, value]) => {
            // Store plain keys from all items
            if (!key.includes("_")) {
              allValues[key] = value;
            }
          });
        });

        // Now collect the indexed values only from items that will remain
        const maxItemsToProcess = Math.min(treeItems.length, newCount);
        for (let i = 0; i < maxItemsToProcess; i++) {
          const item = treeItems[i];
          const lineNumber = item.lineNumber;

          // For each non-indexed field, add an indexed version
          Object.entries(item.values).forEach(([key, value]) => {
            if (!key.includes("_") && lineNumber > 0) {
              const indexedKey = `${key}_${lineNumber}`;
              allValues[indexedKey] = value;
            }
          });
        }

        // For any new lines we'll add, pre-populate with initial values from schema
        // IMPORTANT: This ensures new lines start with schema defaults, not copied values
        for (
          let lineNum = maxExistingLine + 1;
          lineNum <= newCount;
          lineNum++
        ) {
          // Each base (non-indexed) field should have an indexed version for this new line
          Object.entries(schemaInitialValues).forEach(
            ([fieldId, defaultValue]) => {
              const indexedKey = `${fieldId}_${lineNum}`;
              allValues[indexedKey] = defaultValue;
              console.log(
                `🔥 Pre-populating new line ${lineNum} field ${indexedKey} with schema default: ${defaultValue}`
              );
            }
          );
        }

        console.log(
          `🔥 Collected ${Object.keys(allValues).length} total values`
        );

        // Adjust the template for the new count
        console.log(
          `🔥 Calling adjustTemplateForCount with newCount=${newCount}`
        );
        const adjustedTemplate = adjustTemplateForCount(
          currentTemplateText, // Use current template instead of source template
          newCount,
          allValues // This is passed by reference and will be modified by adjustTemplateForCount
        );
        console.log(
          `🔄 Template updated, new length: ${adjustedTemplate.length} chars`
        );

        // Update the template in the UI
        setSelectedTemplate({
          text: adjustedTemplate,
          category: selectedTemplate.category,
        });

        // Update the editor
        setEditorContent(editorId, adjustedTemplate);
        console.log(`🔄 Updated editor content`);

        // Extract line numbers from the adjusted template
        const { lineNumbers } = detectAndExtractNumberedLines(adjustedTemplate);

        // Use Redux action to properly update the tree items
        dispatch(
          updateTreeItemCount({
            newCount,
            initialValues: allValues,
            lineNumbers,
          })
        );

        // Set currentPage appropriately
        if (newCount > oldCount) {
          // If adding lines, navigate to the newly added line
          console.log(`🔄 Added lines: navigating to new line ${newCount}`);
          dispatch(setReduxCurrentPage(newCount));
        } else if (newCount < oldCount && currentPage > newCount) {
          // If removing lines and current page is now invalid, go to the last valid page
          console.log(`🔄 Removed lines: navigating to last line ${newCount}`);
          dispatch(setReduxCurrentPage(newCount));
        }

        console.log(`🔄 handleCountChange COMPLETE`);
      } else {
        console.warn(
          "Cannot update template - sourceTemplate or selectedTemplate is missing"
        );
      }
    },
    [
      treeItems,
      sourceTemplate,
      selectedTemplate,
      setSelectedTemplate,
      setEditorContent,
      editorId,
      count,
      hasCountFieldPlaceholder,
      adjustTemplateForCount,
      schema,
      dispatch,
      currentPage,
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

  // Create a ref to track previous page
  const prevPageRef = useRef<number>(currentPage);

  /**
   * Ensure the template text stays in sync with tree items when switching pages
   * Only run when the page actually changes, not on every render
   */
  useEffect(() => {
    // Check if the page actually changed to avoid unnecessary updates
    if (prevPageRef.current !== currentPage && sourceTemplate) {
      console.log(
        `🔄 Page changed to ${currentPage}, updating template to match`
      );
      prevPageRef.current = currentPage;

      // Use setTimeout to ensure we're working with the latest state
      setTimeout(() => {
        // Get the current tree data from Redux
        const currentState = store.getState().tree;
        const latestTreeItems = currentState.treeItems;

        // Prepare a complete set of values from all tree items
        const allValues: Record<string, FieldValue> = { countField: count };

        // Process all tree items to get their current values
        latestTreeItems.forEach((item: TreeItem) => {
          // Get the line number for this item
          const itemLineNumber = item.lineNumber;

          // Process all values in this item to ensure both regular and indexed versions are included
          Object.entries(item.values).forEach(([key, val]) => {
            // Always include non-indexed values
            if (!key.includes("_")) {
              allValues[key] = val as FieldValue;
            }

            // And always include indexed values specific to this line
            if (key.includes(`_${itemLineNumber}`)) {
              allValues[key] = val as FieldValue;
            }
          });
        });

        if (selectedTemplate) {
          console.log(
            `🔄 Updating template with values for lines 1-${latestTreeItems.length}`
          );
          const updatedTemplate = updateTemplateFromTree(
            sourceTemplate,
            allValues
          );

          setSelectedTemplate({
            text: updatedTemplate,
            category: selectedTemplate.category,
          });

          setEditorContent(editorId, updatedTemplate);
        }
      }, 0);
    }
    // Only include dependencies that trigger the effect when they actually change
    // and won't be modified by the effect itself
  }, [currentPage, sourceTemplate, editorId, count]);

  /**
   * Ensure tree items have appropriate indexed values
   * Fix specific placeholders like measurement and blokker that may be missing
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
          placeholders.forEach((field) => {
            const indexedField = `${field}_${lineNumber}`;

            // If there's a base value but no indexed value, add it
            if (
              item.values[field] !== undefined &&
              item.values[indexedField] === undefined
            ) {
              console.log(
                `🔧 Fixing tree item ${
                  index + 1
                }: Adding missing ${indexedField} with value ${
                  item.values[field]
                }`
              );
              // Update the item to add the indexed field
              item.values[indexedField] = item.values[field];
              itemsFixed = true;
            }

            // If there's an indexed value but no base value, add it
            if (
              item.values[indexedField] !== undefined &&
              item.values[field] === undefined
            ) {
              console.log(
                `🔧 Fixing tree item ${
                  index + 1
                }: Adding missing base field ${field} with value ${
                  item.values[indexedField]
                }`
              );
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
