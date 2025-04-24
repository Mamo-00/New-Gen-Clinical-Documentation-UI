// src/features/tree/treeSlice.ts
import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import { FieldValue } from '../../components/Trees/utilities/treeTypes';

interface TreeItem {
  lineNumber: number;
  values: Record<string, FieldValue>;
}

export interface TreeState {
  items: TreeItem[];
  count: number;
  lineNumbers: number[];
  templateText: string;
}

const initialState: TreeState = {
  items: [],
  count: 1,
  lineNumbers: [],
  templateText: '',
};

export const treeSlice = createSlice({
  name: 'tree',
  initialState,
  reducers: {
    initializeTree: (
      state,
      action: PayloadAction<{
        templateText: string;
        initialValues: Record<string, FieldValue>;
        count: number;
        lineNumbers: number[];
      }>
    ) => {
      const { templateText, initialValues, count, lineNumbers } = action.payload;
      state.templateText = templateText;
      state.count = count;
      state.lineNumbers = lineNumbers;
      
      state.items = Array.from({ length: count }, (_, i) => {
        const lineNumber = lineNumbers[i] || i + 1;
        const itemValues = { ...initialValues };
        
        // Create indexed versions for all initial values
        Object.entries(initialValues).forEach(([key, value]) => {
          if (!key.includes('_')) {
            itemValues[`${key}_${lineNumber}`] = value;
          }
        });
        
        return {
          lineNumber,
          values: itemValues,
        };
      });
    },

    updateField: (
      state,
      action: PayloadAction<{
        itemIndex: number;
        fieldId: string;
        value: FieldValue;
      }>
    ) => {
      const { itemIndex, fieldId, value } = action.payload;
      const item = state.items[itemIndex];
      const lineNumber = item.lineNumber;

      // Update both base field and indexed version
      item.values[fieldId] = value;
      
      if (!fieldId.includes('_') && lineNumber > 0) {
        const indexedKey = `${fieldId}_${lineNumber}`;
        item.values[indexedKey] = value;
      }
    },

    updateCount: (
      state,
      action: PayloadAction<{
        newCount: number;
        templateLine: string;
        initialValues: Record<string, FieldValue>;
      }>
    ) => {
      const { newCount, templateLine, initialValues } = action.payload;
      // Complex logic for adding/removing items
      if (newCount > state.count) {
        for (let i = state.count; i < newCount; i++) {
          const lineNumber = state.lineNumbers[i] || i + 1;
          const newItem = createNewItem(lineNumber, templateLine, initialValues);
          state.items.push(newItem);
        }
      } else {
        state.items = state.items.slice(0, newCount);
      }
      state.count = newCount;
    },

    updateTemplateText: (state, action: PayloadAction<string>) => {
      state.templateText = action.payload;
    },
    
    updateAllValues: (
      state,
      action: PayloadAction<Record<string, FieldValue>>
    ) => {
      const newValues = action.payload;
      
      // Update values across all items
      state.items.forEach(item => {
        Object.keys(newValues).forEach(key => {
          // If the key is indexed (like field_1)
          if (key.includes('_')) {
            const [baseKey, lineNumStr] = key.split('_');
            const lineNum = parseInt(lineNumStr);
            
            // Only update if it belongs to this item
            if (item.lineNumber === lineNum) {
              item.values[key] = newValues[key];
              // Also update the base key
              item.values[baseKey] = newValues[key];
            }
          } else {
            // For non-indexed keys, update on all items
            item.values[key] = newValues[key];
          }
        });
      });
    },
    
    updateLineNumbers: (
      state,
      action: PayloadAction<number[]>
    ) => {
      state.lineNumbers = action.payload;
    }
  },
});

// Helper function for creating new items
function createNewItem(
  lineNumber: number,
  templateLine: string,
  initialValues: Record<string, FieldValue>
): TreeItem {
  const values = { ...initialValues };
  
  // Extract placeholders from template line
  const placeholders = Array.from(
    templateLine.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g),
    match => match[1].trim()
  );

  // Initialize indexed values
  placeholders.forEach(placeholder => {
    if (placeholder !== 'countField') {
      values[`${placeholder}_${lineNumber}`] = initialValues[placeholder] ?? '';
    }
  });

  return { lineNumber, values };
}

// Selectors with memoization
export const selectAllValues = createSelector(
  (state: { tree: TreeState }) => state.tree.items,
  (items) => items.reduce(
    (acc, item) => ({ ...acc, ...item.values }),
    {} as Record<string, FieldValue>
  )
);

export const selectCurrentItemValues = createSelector(
  (state: { tree: TreeState }) => state.tree.items,
  (state: { tree: TreeState }) => state.tree.count,
  (items, count) => items[count - 1]?.values || {}
);

export const { actions } = treeSlice;
export default treeSlice.reducer;