// src/utils/templates/templateParser.ts
import { TemplateField } from "../../components/Trees/interfaces/iTemplateField";
import { FieldValue } from "../../components/Trees/utilities/treeTypes";
import { flattenSchema } from "./flattenSchema";

/**
 * Extracts placeholder keys from the template text based on metadata markers.
 * For each marker, it looks up the field in the flattened schema (if provided)
 * and assigns a default value according to the field type.
 *
 * @param template - The raw template text containing placeholder metadata.
 * @param schema - The template schema containing nested field definitions.
 * @returns An object mapping field names to their default values.
 */
export function extractValuesFromTemplate(
  template: string,
  schema?: TemplateField
): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  
  // Extract all placeholders along with their line context
  const placeholdersWithContext = extractPlaceholdersWithContext(template);
  
  // If a schema is provided, flatten it:
  console.log("updatetemp schema: ", schema);
  
  const flatSchema = schema ? flattenSchema(schema) : {};

  // Process each placeholder with its context
  placeholdersWithContext.forEach(({ placeholder, lineNumber }) => {
    const fieldKey = placeholder;
    
    // For placeholders in numbered lines, we'll create indexed versions
    // but also keep the original for backward compatibility
    let fieldKeyToUse = fieldKey;
    
    // If this placeholder is in a numbered line, create an indexed version
    if (lineNumber > 0) {
      fieldKeyToUse = `${fieldKey}_${lineNumber}`;
    }
    
    if (flatSchema[fieldKey]) {
      const fieldType = flatSchema[fieldKey].type;
      let defaultValue: FieldValue;
      
      switch (fieldType) {
        case "number":
          defaultValue = flatSchema[fieldKey].defaultValue !== undefined ? flatSchema[fieldKey].defaultValue : 0;
          break;
        case "checkbox":
          defaultValue = flatSchema[fieldKey].defaultValue !== undefined ? flatSchema[fieldKey].defaultValue : false;
          break;
        default: // "text", "dropdown", etc.
          defaultValue = flatSchema[fieldKey].defaultValue !== undefined ? flatSchema[fieldKey].defaultValue : "";
          break;
      }
      
      // Store both the indexed version and the original (if they differ)
      values[fieldKeyToUse] = defaultValue;
      
      // If it's an indexed version and different from the original field key,
      // also store the non-indexed version for backward compatibility
      if (fieldKeyToUse !== fieldKey) {
        values[fieldKey] = defaultValue;
      }
    } else {
      // Fallback if the field key isn't found in the schema.
      values[fieldKeyToUse] = "";
      
      // Same as above, store both versions
      if (fieldKeyToUse !== fieldKey) {
        values[fieldKey] = "";
      }
    }
  });
  
  return values;
}

/**
 * Extract all placeholders from the template text and determine their line context.
 * If a placeholder appears in a numbered line (e.g., "1: {{placeholder}}"), 
 * we associate it with that line number.
 */
export function extractPlaceholdersWithContext(
  template: string
): Array<{ placeholder: string; lineNumber: number }> {
  const result: Array<{ placeholder: string; lineNumber: number }> = [];
  
  // Split the template into lines for analysis
  const lines = template.split('\n');
  
  lines.forEach(line => {
    // Check if this is a numbered line (e.g., "1:", "2:", etc.)
    const lineNumberMatch = line.match(/^(\d+)\s*:/);
    const lineNumber = lineNumberMatch ? parseInt(lineNumberMatch[1]) : 1;
    
    // Extract all placeholders in this line
    const placeholderRegex = /\{\{\s*([^}]+?)\s*\}\}/g;
    let match;
    
    while ((match = placeholderRegex.exec(line)) !== null) {
      const placeholder = match[1].trim();
      
      // Add to result with line context
      result.push({ placeholder, lineNumber });
    }
  });
  
  return result;
}
