// src/features/templateSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FieldValue } from '../components/Trees/utilities/treeTypes';

interface TreeItem {
  id: number;
  lineNumber: number;
  values: Record<string, FieldValue>;
}

export interface TemplateState {
  treeItems: TreeItem[];
  sourceTemplate: string;
  currentTemplate: string;
  count: number;
}

const initialState: TemplateState = {
  treeItems: [],
  sourceTemplate: '',
  currentTemplate: '',
  count: 1
};

export const templateSlice = createSlice({
  name: 'template',
  initialState,
  reducers: {
    setTreeItems: (state, action: PayloadAction<TreeItem[]>) => {
      state.treeItems = action.payload;
    },
    updateTreeItemField: (state, action: PayloadAction<{
      itemIndex: number;
      fieldId: string;
      value: FieldValue;
    }>) => {
      const { itemIndex, fieldId, value } = action.payload;
      const treeItem = state.treeItems[itemIndex];
      
      if (treeItem) {
        treeItem.values[fieldId] = value;
        
        // Also update indexed version if needed
        const lineNumber = treeItem.lineNumber;
        if (!fieldId.includes("_") && lineNumber > 0) {
          treeItem.values[`${fieldId}_${lineNumber}`] = value;
        }
      }
    },
    setSourceTemplate: (state, action: PayloadAction<string>) => {
      state.sourceTemplate = action.payload;
    },
    setCurrentTemplate: (state, action: PayloadAction<string>) => {
      state.currentTemplate = action.payload;
    },
    setCount: (state, action: PayloadAction<number>) => {
      state.count = action.payload;
    }
  }
});

export const { 
  setTreeItems, 
  updateTreeItemField,
  setSourceTemplate,
  setCurrentTemplate,
  setCount
} = templateSlice.actions;

export default templateSlice.reducer;