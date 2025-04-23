// src/utils/templates/placeholderRegistry.ts
import { TemplateField } from "../../components/Trees/interfaces/iTemplateField";
import { FieldValue } from "../../components/Trees/utilities/treeTypes";
import { glass, hudbit, traadvev, polypp } from "../../components/Trees/utilities/tree-schema";
import { flattenSchema } from "./flattenSchema";

export interface PlaceholderDefinition {
  id: string;
  type: "text" | "number" | "checkbox" | "dropdown";
  label: string;
  defaultValue?: FieldValue;
  unit?: string;
  options?: string[];
  helpText?: string;
  isIndented?: boolean;
  // We'll omit conditional logic for now as it would need restructuring
}

// First, define proper interfaces for our relationships
interface ConditionalRelationship {
  conditionalFields: string[];
}

interface PlaceholderRelationshipMap {
  [placeholderId: string]: ConditionalRelationship;
}

// Create a properly typed placeholder relationships map
const placeholderRelationships: PlaceholderRelationshipMap = {
  "oppdelt": {
    conditionalFields: ["oppdeltNumber"]
  },
  // Add other relationships here...
};

// Create a master registry by flattening all schemas
export const placeholderRegistry: Record<string, PlaceholderDefinition> = {};

// Initialize registry on module load
(() => {
  // Add all schema fields to the registry
  [glass, hudbit, traadvev, polypp].forEach(schema => {
    const flatSchema = flattenSchema(schema);
    Object.entries(flatSchema).forEach(([id, field]) => {
      // Skip container types as they're not placeholders
      if (field.type === "container") return;
      
      placeholderRegistry[id] = {
        id,
        type: field.type,
        label: field.label || id,
        defaultValue: field.defaultValue,
        unit: field.unit,
        options: field.options,
        helpText: field.helpText,
        isIndented: field.isIndented
      };
    });
  });
  
  // Add special placeholders
  placeholderRegistry["countField"] = {
    id: "countField",
    type: "number",
    label: "Antall",
    defaultValue: 1,
    helpText: "Number of items"
  };

  // Add common placeholders not in schemas
  placeholderRegistry["x"] = {
    id: "x",
    type: "text",
    label: "Beskrivelse",
    defaultValue: "",
    helpText: "General description text"
  };
})();

// Helper function to extract all placeholders from template text
export function extractPlaceholdersFromTemplate(templateText: string): string[] {
  const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
  const placeholders: string[] = [];
  let match;
  
  while ((match = placeholderRegex.exec(templateText)) !== null) {
    const placeholder = match[1].trim();
    if (!placeholders.includes(placeholder)) {
      placeholders.push(placeholder);
    }
  }
  
  return placeholders;
}

// Modify the placeholder processing code with proper typing
export function generateSchemaFromTemplate(templateText: string): TemplateField {
  const placeholders = extractPlaceholdersFromTemplate(templateText);
  
  // Create a mapped object of field definitions for easier access and type safety
  const fieldDefinitionsMap: Record<string, TemplateField> = {};
  
  // First pass: create basic field definitions
  placeholders.forEach(placeholder => {
    // Look up in registry or create default text field
    const definition = placeholderRegistry[placeholder] || {
      id: placeholder,
      type: "text" as const, // Use const assertion to fix type
      label: placeholder,
      defaultValue: "",
      helpText: `Value for ${placeholder}`
    };
    
    fieldDefinitionsMap[placeholder] = definition;
  });
  
  // Second pass: process conditional relationships
  placeholders.forEach(placeholder => {
    if (placeholderRelationships[placeholder]) {
      // Add conditional logic to the schema
      const conditionalFields = placeholderRelationships[placeholder].conditionalFields;
      conditionalFields.forEach(conditionalField => {
        // Check if the field exists before trying to modify it
        if (fieldDefinitionsMap[conditionalField]) {
          // Safely assign the conditionalOn property
          fieldDefinitionsMap[conditionalField] = {
            ...fieldDefinitionsMap[conditionalField],
            conditionalOn: placeholder,
            // You might also need to set conditionalValue
            conditionalValue: true // or appropriate value
          };
        }
      });
    }
  });
  
  // Convert the map back to an array
  const fieldDefinitions = Object.values(fieldDefinitionsMap);
  
  // Group fields by type for better organization
  const textFields = fieldDefinitions.filter(f => f.type === "text");
  const numberFields = fieldDefinitions.filter(f => f.type === "number");
  const checkboxFields = fieldDefinitions.filter(f => f.type === "checkbox");
  const dropdownFields = fieldDefinitions.filter(f => f.type === "dropdown");
  
  // Create a container for each type
  const containers: TemplateField[] = [];
  
  if (textFields.length > 0) {
    containers.push({
      id: "textFields",
      type: "container",
      label: "Text Values",
      layout: "vertical",
      children: textFields
    });
  }
  
  if (numberFields.length > 0) {
    containers.push({
      id: "numberFields",
      type: "container",
      label: "Numeric Values",
      layout: "vertical",
      children: numberFields
    });
  }
  
  if (checkboxFields.length > 0) {
    containers.push({
      id: "checkboxFields",
      type: "container",
      label: "Options",
      layout: "vertical",
      children: checkboxFields
    });
  }
  
  if (dropdownFields.length > 0) {
    containers.push({
      id: "dropdownFields",
      type: "container",
      label: "Selection Values",
      layout: "vertical",
      children: dropdownFields
    });
  }
  
  // Create the root schema
  return {
    id: "placeholderRoot",
    type: "container",
    layout: "vertical",
    children: containers
  };
}