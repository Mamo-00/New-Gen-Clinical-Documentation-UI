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
  updateAllTreeValues
} = treeSlice.actions;

export default treeSlice.reducer; 