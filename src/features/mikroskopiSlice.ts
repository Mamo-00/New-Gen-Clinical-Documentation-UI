import { createSlice, PayloadAction, createSelector } from "@reduxjs/toolkit";
import { RootState } from "../app/store";
import { FieldValue } from "../components/Trees/utilities/treeTypes";
import enhancedDictionary from "../data/dictionaries/enhanced-dictionary.json";
import { MikroskopiPanelField } from "../components/TarmScreening/interface/iMikroskopiPanelField";

interface MikroskopiPanelState {
  [fieldId: string]: FieldValue;
}

export interface BlockDescriptionState {
  blockNumber: number;
  fieldValues: Record<string, MikroskopiPanelState>;
  isAnalogTo?: number;
  // add a free-text note specific to this block here if needed
  // blockSpecificNote?: string;
}

export interface MikroskopiState {
  // If you need to manage state per lesion, add a lesionId key here
  currentLesionId: string | null;
  fieldValuesByLesion: Record<string, Record<string, MikroskopiPanelState>>;

  fieldValues: Record<string, MikroskopiPanelState>;
  activeStep: number;
  allBlockDescriptions: BlockDescriptionState[];
  currentBlockIndex: number;
  totalBlocksForCurrentLesion: number;
}

// Function to get default values from the dictionary
const getDefaultValues = (): Record<string, MikroskopiPanelState> => {
  const defaults: Record<string, MikroskopiPanelState> = {};
  enhancedDictionary.mikroskopiPanels.forEach((panel) => {
    defaults[panel.id] = {};
    panel.fields.forEach((field) => {
      const typedField = field as unknown as MikroskopiPanelField;
      if (typedField.type === "checkboxGroup") {
        const groupDefaults: Record<string, boolean> = {};
        if (typedField.options) {
          typedField.options.forEach((opt: string) => {
            groupDefaults[opt] = false;
          });
        }
        defaults[panel.id][typedField.id] = groupDefaults;
      } else {
        defaults[panel.id][typedField.id] = typedField.defaultValue ?? "";
      }
    });
  });
  return defaults;
};

const createNewBlockDescription = (
  blockNumber: number
): BlockDescriptionState => ({
  blockNumber,
  fieldValues: getDefaultValues(),
  isAnalogTo: undefined,
});

const initialState: MikroskopiState = {
  fieldValues: getDefaultValues(),
  currentLesionId: null,
  fieldValuesByLesion: {},
  activeStep: 0,
  allBlockDescriptions: [createNewBlockDescription(1)], // Start with one block
  currentBlockIndex: 0,
  totalBlocksForCurrentLesion: 1,
};

export const mikroskopiSlice = createSlice({
  name: "mikroskopi",
  initialState,
  reducers: {
    setTotalBlocksForCurrentLesion: (state, action: PayloadAction<number>) => {
      const newTotal = Math.max(1, action.payload); // Ensure at least 1 block
      state.totalBlocksForCurrentLesion = newTotal;
      // Adjust allBlockDescriptions array size
      const currentLength = state.allBlockDescriptions.length;
      if (newTotal > currentLength) {
        for (let i = currentLength + 1; i <= newTotal; i++) {
          state.allBlockDescriptions.push(createNewBlockDescription(i));
        }
      } else if (newTotal < currentLength) {
        state.allBlockDescriptions = state.allBlockDescriptions.slice(
          0,
          newTotal
        );
      }
      // Ensure currentBlockIndex is valid
      if (state.currentBlockIndex >= newTotal) {
        state.currentBlockIndex = Math.max(0, newTotal - 1);
      }
    },
    setCurrentBlockIndex: (state, action: PayloadAction<number>) => {
      // Ensure index is within bounds
      const newIndex = Math.max(
        0,
        Math.min(action.payload, state.allBlockDescriptions.length - 1)
      );
      if (state.currentBlockIndex !== newIndex) {
        state.currentBlockIndex = newIndex;
        state.activeStep = 0; // Reset stepper when changing blocks
      }
    },
    setMikroskopiFieldValueForCurrentBlock: (
      state,
      action: PayloadAction<{
        panelId: string;
        fieldId: string;
        value: FieldValue;
      }>
    ) => {
      const { panelId, fieldId, value } = action.payload;
      const currentBlock = state.allBlockDescriptions[state.currentBlockIndex];
      if (currentBlock) {
        if (!currentBlock.fieldValues[panelId]) {
          currentBlock.fieldValues[panelId] = {};
        }
        currentBlock.fieldValues[panelId][fieldId] = value;
        // If this block was analog, it's now being edited, so clear the analog status
        currentBlock.isAnalogTo = undefined;
      }
    },
    resetPanelFieldsForCurrentBlock: (
      state,
      action: PayloadAction<{ panelId: string }>
    ) => {
      const { panelId } = action.payload;
      const currentBlock = state.allBlockDescriptions[state.currentBlockIndex];
      if (currentBlock) {
        const panelSchema = enhancedDictionary.mikroskopiPanels.find(
          (p) => p.id === panelId
        );
        if (panelSchema) {
          const panelDefaults: MikroskopiPanelState = {};
          // ... (logic to get defaults for this panel's fields, same as in getDefaultBlockFieldValues)
          panelSchema.fields.forEach((field) => {
            const typedField = field as unknown as {
              type: string;
              options?: string[];
              defaultValue: any;
              id: string;
            };
            if (typedField.type === "checkboxGroup") {
              /* ... */
            } else {
              /* ... */
            }
          });
          currentBlock.fieldValues[panelId] = panelDefaults;
          currentBlock.isAnalogTo = undefined; // Editing resets analog
        }
      }
    },
    resetAllMikroskopiForCurrentBlock: (state) => {
      const currentBlock = state.allBlockDescriptions[state.currentBlockIndex];
      if (currentBlock) {
        currentBlock.fieldValues = getDefaultValues();
        currentBlock.isAnalogTo = undefined;
      }
      state.activeStep = 0;
    },
    // New: Action to mark current block as analog to another
    markCurrentBlockAsAnalogTo: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      // undefined to clear
      const currentBlock = state.allBlockDescriptions[state.currentBlockIndex];
      if (currentBlock) {
        currentBlock.isAnalogTo = action.payload;
        if (action.payload !== undefined) {
          // If marking as analog, copy values from the target block
          const targetBlock = state.allBlockDescriptions.find(
            (b) => b.blockNumber === action.payload
          );
          if (targetBlock) {
            // Deep copy fieldValues to avoid reference issues
            currentBlock.fieldValues = JSON.parse(
              JSON.stringify(targetBlock.fieldValues)
            );
          }
        }
        // If clearing analog status (action.payload is undefined), the user will start editing,
        // and the fields will update naturally. Or you could reset to defaults:
        else {
          currentBlock.fieldValues = getDefaultValues();
        }
      }
    },
    setMikroskopiFieldValue: (
      state,
      action: PayloadAction<{
        panelId: string;
        fieldId: string;
        value: FieldValue;
      }>
    ) => {
      const { panelId, fieldId, value } = action.payload;
      if (!state.fieldValues[panelId]) {
        state.fieldValues[panelId] = {};
      }
      state.fieldValues[panelId][fieldId] = value;
    },
    resetMikroskopiPanel: (
      state,
      action: PayloadAction<{ panelId: string }>
    ) => {
      const { panelId } = action.payload;
      const panelDefaults: MikroskopiPanelState = {};
      const panelSchema = enhancedDictionary.mikroskopiPanels.find(
        (p) => p.id === panelId
      );
      panelSchema?.fields.forEach((field) => {
        if (field.type === "checkboxGroup") {
          const groupDefaults: Record<string, boolean> = {};
          if ("options" in field && Array.isArray(field.options)) {
            field.options.forEach((opt) => {
              groupDefaults[opt] = false;
            });
          }
          panelDefaults[field.id] = groupDefaults;
        } else {
          panelDefaults[field.id] = field.defaultValue ?? "";
        }
      });
      state.fieldValues[panelId] = panelDefaults;
    },
    resetMikroskopiPanelFields: (
      state,
      action: PayloadAction<{ panelId: string }>
    ) => {
      const { panelId } = action.payload;
      const panelSchema = enhancedDictionary.mikroskopiPanels.find(
        (p) => p.id === panelId
      );
      if (panelSchema) {
        const panelDefaults: MikroskopiPanelState = {};
        panelSchema.fields.forEach((field) => {
          if (field.type === "checkboxGroup") {
            const groupDefaults: Record<string, boolean> = {};
            if ("options" in field && Array.isArray(field.options)) {
              field.options.forEach((opt) => {
                groupDefaults[opt] = false;
              });
            }
            panelDefaults[field.id] = groupDefaults;
          } else {
            panelDefaults[field.id] = field.defaultValue ?? "";
          }
        });
        state.fieldValues[panelId] = panelDefaults;
      }
    },
    resetAllMikroskopi: (state) => {
      state.fieldValues = getDefaultValues();
      state.activeStep = 0; // Reset step as well
    },
    setActiveMikroskopiStep: (state, action: PayloadAction<number>) => {
      state.activeStep = action.payload;
    },
  },
});

export const {
  setMikroskopiFieldValue,
  resetMikroskopiPanelFields, // Renamed for clarity
  resetAllMikroskopi,
  setActiveMikroskopiStep,
  setTotalBlocksForCurrentLesion,
  setCurrentBlockIndex,
  setMikroskopiFieldValueForCurrentBlock,
  resetPanelFieldsForCurrentBlock,
  resetAllMikroskopiForCurrentBlock,
  markCurrentBlockAsAnalogTo,
} = mikroskopiSlice.actions;

// Selectors (remain mostly the same)
const selectMikroskopiFieldValues = (state: RootState) =>
  state.mikroskopi.fieldValues;
export const selectActiveMikroskopiStep = (state: RootState) =>
  state.mikroskopi.activeStep;

export const selectAllBlockDescriptions = (state: RootState) => state.mikroskopi.allBlockDescriptions;
export const selectCurrentBlockIndex = (state: RootState) => state.mikroskopi.currentBlockIndex;
export const selectTotalBlocks = (state: RootState) => state.mikroskopi.totalBlocksForCurrentLesion;

export const selectCurrentBlockData = createSelector(
    [selectAllBlockDescriptions, selectCurrentBlockIndex],
    (allDescriptions, currentIndex) => allDescriptions[currentIndex] // Can be undefined if array is empty
);

export const selectFieldValuesForCurrentBlock = createSelector(
    [selectCurrentBlockData],
    (currentBlock) => currentBlock?.fieldValues || {} // Return empty object if no current block
);

// Selector for values of a specific panel in the current block
export const selectPanelValuesForCurrentBlock = createSelector(
  [selectFieldValuesForCurrentBlock, (_state: RootState, panelId: string) => panelId],
  (currentBlockFieldValues, panelId) => currentBlockFieldValues[panelId] || {}
);

export const selectPanelValues = createSelector(
  [
    selectMikroskopiFieldValues,
    (_state: RootState, panelId: string) => panelId,
  ],
  (fieldValues, panelId) => fieldValues[panelId] || {}
);

export const selectAllMikroskopiValues = createSelector(
  [selectMikroskopiFieldValues],
  (fieldValues) => fieldValues
);

export default mikroskopiSlice.reducer;
