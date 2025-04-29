import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FieldValue } from '../components/Trees/utilities/treeTypes';

// Define TreeItem interface directly here
export interface TreeItem {
  id: number;
  lineNumber: number;
  values: Record<string, FieldValue>;
}

export interface TreeState {
  treeItems: TreeItem[];
  currentPage: number;
  itemsPerPage: number;
  templateText: string;
  editorId: string;
  lastUpdated: number; // Timestamp to track the last update
}

const initialState: TreeState = {
  treeItems: [],
  currentPage: 1,
  itemsPerPage: 1,
  templateText: '',
  editorId: '',
  lastUpdated: 0,
};

export const treeSlice = createSlice({
  name: 'tree',
  initialState,
  reducers: {
    setTreeItems: (state, action: PayloadAction<TreeItem[]>) => {
      state.treeItems = action.payload;
      state.lastUpdated = Date.now();
    },
    setCurrentPage: (state, action: PayloadAction<number>) => {
      state.currentPage = action.payload;
    },
    setItemsPerPage: (state, action: PayloadAction<number>) => {
      state.itemsPerPage = action.payload;
    },
    setTemplateText: (state, action: PayloadAction<string>) => {
      state.templateText = action.payload;
    },
    setEditorId: (state, action: PayloadAction<string>) => {
      state.editorId = action.payload;
    },
    updateTreeItemValue: (
      state, 
      action: PayloadAction<{
        itemIndex: number, 
        fieldId: string, 
        value: FieldValue,
        lineNumber: number
      }>
    ) => {
      const { itemIndex, fieldId, value, lineNumber } = action.payload;
      
      if (itemIndex >= 0 && itemIndex < state.treeItems.length) {
        // Get the current tree item
        const currentItem = state.treeItems[itemIndex];
        
        // Check if value is actually different to avoid unnecessary updates
        if (currentItem.values[fieldId] === value) {
          return; // No change needed
        }
        
        // Handle the base field first (non-indexed)
        let baseField = fieldId;
        let isIndexed = false;
        
        // If this is an indexed field (like "field_1"), extract the base field
        if (fieldId.includes('_')) {
          const parts = fieldId.split('_');
          // Ensure we have a valid indexed field pattern
          if (parts.length >= 2 && !isNaN(Number(parts[parts.length-1]))) {
            baseField = parts[0];
            isIndexed = true;
          }
        }
        
        // ONLY update fields in the current item being edited
        
        // Update the main field in this item
        currentItem.values[fieldId] = value;
        
        // For non-indexed fields, update the corresponding indexed field in THIS item
        if (!isIndexed && lineNumber > 0) {
          const indexedKey = `${baseField}_${lineNumber}`;
          currentItem.values[indexedKey] = value;
        }
        
        // For indexed fields, update the base field in THIS item only
        if (isIndexed) {
          currentItem.values[baseField] = value;
        }
        
        // Mark as updated
        state.lastUpdated = Date.now();
      }
    },
    updateAllTreeValues: (
      state,
      action: PayloadAction<Record<string, FieldValue>>
    ) => {
      // This is used when we want to update all field values from outside
      const allValues = action.payload;
      
      state.treeItems.forEach(item => {
        Object.keys(allValues).forEach(key => {
          if (key.includes(`_${item.lineNumber}`)) {
            item.values[key] = allValues[key];
          }
        });
      });
      
      state.lastUpdated = Date.now();
    },
    updateTreeItemCount: (
      state,
      action: PayloadAction<{
        newCount: number,
        initialValues: Record<string, FieldValue>,
        lineNumbers?: number[]
      }>
    ) => {
      const { newCount, initialValues, lineNumbers = [] } = action.payload;
      const currentCount = state.treeItems.length;
      
      if (newCount === currentCount) return;
      
      // Clean initialValues to prevent duplicate indexed values
      const cleanedValues: Record<string, FieldValue> = {};
      
      // First, collect all non-indexed fields (base values)
      Object.entries(initialValues).forEach(([key, value]) => {
        if (!key.includes('_')) {
          cleanedValues[key] = value;
        }
      });
      
      // Then collect all properly indexed fields
      Object.entries(initialValues).forEach(([key, value]) => {
        // Only keep properly indexed fields (fieldname_NUMBER with just one underscore)
        if (key.includes('_')) {
          const parts = key.split('_');
          if (parts.length === 2 && !isNaN(Number(parts[1]))) {
            const lineNum = Number(parts[1]);
            // Only include indexed values for lines that will exist after the update
            if (lineNum <= newCount) {
              cleanedValues[key] = value;
            }
          }
        }
      });
      
      console.log(`🔄 updateTreeItemCount: Starting with ${currentCount} items, updating to ${newCount}`);
      
      // If increasing count, add new items
      if (newCount > currentCount) {
        const newItems: TreeItem[] = [];
        
        // Add new items with proper IDs and line numbers
        for (let i = currentCount + 1; i <= newCount; i++) {
          // Use provided line number or sequential
          const lineNumber = lineNumbers[i - 1] || i;
          
          // Create a fresh values object for this item
          const itemValues: Record<string, FieldValue> = { ...cleanedValues };
          
          // Important: For new items, we need to extract both the
          // non-indexed values AND the specific indexed values for this line
          
          // First, get all non-indexed values (general defaults)
          Object.entries(initialValues).forEach(([key, value]) => {
            if (!key.includes('_')) {
              itemValues[key] = value;
            }
          });
          
          // Then, look specifically for this line's indexed values
          Object.entries(initialValues).forEach(([key, value]) => {
            if (key.includes(`_${lineNumber}`)) {
              // For indexed values like "field_3", extract just the field name
              const baseField = key.split('_')[0];
              
              // Set both the indexed version and base version in the new item
              itemValues[key] = value;
              itemValues[baseField] = value;
            }
          });
          
          newItems.push({
            id: i,
            lineNumber,
            values: itemValues,
          });
        }
        
        // Add the new items to the end
        state.treeItems = [...state.treeItems, ...newItems];
        console.log(`🔄 Added ${newItems.length} new items with proper values`);
      } 
      // If decreasing count, remove items from the end and clean up remaining items
      else if (newCount < currentCount) {
        // Get the line numbers that are being removed
        const removedLineNumbers = state.treeItems
          .slice(newCount)
          .map(item => item.lineNumber);
        
        // Remove the items
        state.treeItems = state.treeItems.slice(0, newCount);
        
        // Clean up any remaining indexed values in the remaining items
        // that refer to line numbers that no longer exist
        state.treeItems.forEach(item => {
          const cleanedItemValues: Record<string, FieldValue> = {};
          
          // Keep only valid values
          Object.entries(item.values).forEach(([key, value]) => {
            // Keep non-indexed values
            if (!key.includes('_')) {
              cleanedItemValues[key] = value;
            } 
            // Check if the indexed value refers to a line number that still exists
            else {
              const parts = key.split('_');
              if (parts.length === 2) {
                const lineNum = Number(parts[1]);
                // Only keep if the line number is valid and not in the removed list
                if (!isNaN(lineNum) && !removedLineNumbers.includes(lineNum)) {
                  cleanedItemValues[key] = value;
                }
              }
            }
          });
          
          // Replace the values with the cleaned up version
          item.values = cleanedItemValues;
        });
        
        // Adjust current page if it's now out of bounds
        const totalPages = Math.ceil(newCount / state.itemsPerPage);
        if (state.currentPage > totalPages && totalPages > 0) {
          state.currentPage = totalPages;
        }
        
        console.log(`🔄 Removed items, now have ${state.treeItems.length} items`);
      }
      
      state.lastUpdated = Date.now();
    }
  },
});

export const { 
  setTreeItems, 
  setCurrentPage, 
  setItemsPerPage, 
  setTemplateText,
  setEditorId,
  updateTreeItemValue,
  updateAllTreeValues,
  updateTreeItemCount
} = treeSlice.actions;

export default treeSlice.reducer; 