// src/utils/templates/updateTemplateFromTree.ts
import { FieldValue } from "../../components/Trees/utilities/treeTypes";

/**
 * Parse a key to extract its base field name and line number if it's an indexed field.
 * @param key - The field key to parse
 * @returns An object with baseField and lineNumber, or null if not a valid indexed field
 */
function parseIndexedKey(key: string): { baseField: string; lineNumber: number } | null {
  if (!key.includes('_')) return null;
  
  const parts = key.split('_');
  if (parts.length !== 2) return null;
  
  const lineNumber = Number(parts[1]);
  if (isNaN(lineNumber)) return null;
  
  return {
    baseField: parts[0],
    lineNumber
  };
}

/**
 * Replace metadata placeholders in the original template with the field values.
 *
 * @param originalTemplate - The template text containing metadata placeholders.
 * @param fieldValues - An object mapping field names to their current values.
 * @returns The updated template.
 */
export function updateTemplateFromTree(
  originalTemplate: string,
  fieldValues: Record<string, FieldValue>
): string {
  console.log("🔄 updateTemplateFromTree START");
  
  // Clean fieldValues to avoid duplicates and nested keys
  const cleanedValues: Record<string, FieldValue> = {};
  
  // First, copy all non-indexed fields
  Object.entries(fieldValues).forEach(([key, value]) => {
    if (!key.includes('_')) {
      cleanedValues[key] = value;
    }
  });
  
  // Then add properly indexed fields (only single underscore fields)
  Object.entries(fieldValues).forEach(([key, value]) => {
    const parsed = parseIndexedKey(key);
    if (parsed) {
      cleanedValues[key] = value;
    }
  });
  
  console.log("🔄 Field values for update:", JSON.stringify(cleanedValues, null, 2));
  
  // Log all indexed field keys
  const indexedFields = Object.keys(cleanedValues).filter(key => key.includes("_"));
  console.log("🔄 Indexed fields:", JSON.stringify(indexedFields, null, 2));
  
  // First, handle countField separately to ensure consistency
  let updatedTemplate = originalTemplate;
  if (cleanedValues.countField !== undefined) {
    updatedTemplate = updatedTemplate.replace(
      /\{\{\s*countField\s*\}\}/g,
      String(cleanedValues.countField)
    );
  }
  
  // Get the final count to determine how many numbered lines we need
  const targetCount = Number(cleanedValues.countField) || 0;
  console.log("🔄 Target count:", targetCount);
  
  // Split the template into lines
  let lines = updatedTemplate.split('\n');
  
  // Find existing numbered lines
  const numberedLineIndices: {index: number, lineNum: number}[] = [];
  const lineNumberPattern = /^(\d+)\s*:/;
  
  // First pass: identify numbered lines
  lines.forEach((line, index) => {
    const match = line.match(lineNumberPattern);
    if (match) {
      const lineNum = parseInt(match[1]);
      numberedLineIndices.push({ index, lineNum });
    }
  });
  
  console.log("🔄 Found numbered lines:", JSON.stringify(numberedLineIndices.map(l => `Line ${l.lineNum} at index ${l.index}`), null, 2));
  
  // Sort by line number
  numberedLineIndices.sort((a, b) => a.lineNum - b.lineNum);
  
  // Build a map of line numbers to their indexed values
  const lineValueMap: Record<number, Record<string, FieldValue>> = {};
  
  // Initialize the line value map with base values for all lines
  for (let i = 1; i <= targetCount; i++) {
    lineValueMap[i] = {};
    
    // First add base field values to all lines
    Object.entries(cleanedValues).forEach(([key, value]) => {
      if (!key.includes('_')) {
        lineValueMap[i][key] = value;
      }
    });
  }
  
  // Now override with indexed values for specific lines
  indexedFields.forEach(key => {
    const parsed = parseIndexedKey(key);
    if (parsed && parsed.lineNumber <= targetCount) {
      const { baseField, lineNumber } = parsed;
      if (!lineValueMap[lineNumber]) {
        lineValueMap[lineNumber] = {};
      }
      lineValueMap[lineNumber][baseField] = cleanedValues[key];
    }
  });
  
  console.log("🔄 Line value map:", JSON.stringify(lineValueMap, null, 2));
  
  // Process each line to replace placeholders in the existing lines
  lines = lines.map((line, lineIndex) => {
    // Check if this is a numbered line
    const match = line.match(lineNumberPattern);
    if (match) {
      const lineNum = parseInt(match[1]);
      console.log(`🔄 Processing numbered line ${lineNum} at index ${lineIndex}`);
      
      // Process only numbered lines that should be kept
      if (lineNum <= targetCount) {
        // Replace all placeholders in this line with their indexed values
        const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
        let placeholderMatch;
        let updatedLine = line;
        
        // Create a new RegExp for each replacement to avoid state issues
        const placeholderFinder = new RegExp(placeholderPattern);
        while ((placeholderMatch = placeholderFinder.exec(line)) !== null) {
          const placeholder = placeholderMatch[1].trim();
          if (placeholder === "countField") continue; // Skip countField as it's already handled
          
          // Check if we have a value for this line in our map
          if (lineValueMap[lineNum] && lineValueMap[lineNum][placeholder] !== undefined) {
            const lineValue = lineValueMap[lineNum][placeholder];
            console.log(`🔄 Line ${lineNum}: Replacing {{${placeholder}}} with mapped value ${JSON.stringify(lineValue)} from line map`);
            updatedLine = updatedLine.replace(
              new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
              String(lineValue)
            );
          } else {
            console.log(`🔄 Line ${lineNum}: No value found for placeholder {{${placeholder}}}`);
          }
        }
        
        console.log(`🔄 Line ${lineNum} after processing: ${updatedLine}`);
        return updatedLine;
      }
      // Skip lines that should be removed (lineNum > targetCount)
      console.log(`🔄 Removing line ${lineNum} (exceeds target count ${targetCount})`);
      return null;
    }
    
    // For non-numbered lines, replace all placeholders normally
    const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
    let placeholderMatch;
    let updatedLine = line;
    
    // Create a new RegExp for each replacement to avoid state issues
    const placeholderFinder = new RegExp(placeholderPattern);
    while ((placeholderMatch = placeholderFinder.exec(line)) !== null) {
      const placeholder = placeholderMatch[1].trim();
      if (placeholder === "countField") continue; // Skip countField as it's already handled
      
      if (cleanedValues[placeholder] !== undefined) {
        console.log(`🔄 Non-numbered line: Replacing {{${placeholder}}} with value ${JSON.stringify(cleanedValues[placeholder])}`);
        updatedLine = updatedLine.replace(
          new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
          String(cleanedValues[placeholder])
        );
      } else {
        console.log(`🔄 Non-numbered line: No value found for placeholder {{${placeholder}}}`);
      }
    }
    
    return updatedLine;
  }).filter(line => line !== null) as string[]; // Remove null lines
  
  // Add new numbered lines if needed
  if (numberedLineIndices.length > 0 && targetCount > numberedLineIndices[numberedLineIndices.length - 1].lineNum) {
    const lastExistingLineNum = numberedLineIndices[numberedLineIndices.length - 1].lineNum;
    
    console.log(`🔄 Adding ${targetCount - lastExistingLineNum} new numbered lines`);
    
    for (let i = lastExistingLineNum + 1; i <= targetCount; i++) {
      // Create a new line based on the template line, but with updated line number
      let newLine = lines[numberedLineIndices[numberedLineIndices.length - 1].index].replace(lineNumberPattern, `${i}:`);
      console.log(`🔄 New line template for line ${i}: ${newLine}`);
      
      // Replace placeholders with their indexed values if available
      const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
      let placeholderMatch;
      
      // Create a new RegExp for each replacement to avoid state issues
      const placeholderFinder = new RegExp(placeholderPattern);
      while ((placeholderMatch = placeholderFinder.exec(lines[numberedLineIndices[numberedLineIndices.length - 1].index])) !== null) {
        const placeholder = placeholderMatch[1].trim();
        if (placeholder === "countField") continue; // Skip countField as it's already handled
        
        // Use the line value map for replacement
        if (lineValueMap[i] && lineValueMap[i][placeholder] !== undefined) {
          console.log(`🔄 New line ${i}: Replacing {{${placeholder}}} with value ${JSON.stringify(lineValueMap[i][placeholder])}`);
          newLine = newLine.replace(
            new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
            String(lineValueMap[i][placeholder])
          );
        } else {
          console.log(`🔄 New line ${i}: No value found for placeholder {{${placeholder}}}`);
        }
      }
      
      console.log(`🔄 Adding new line ${i}: ${newLine}`);
      lines.push(newLine);
    }
  }
  
  // Rejoin the lines and return the updated template
  updatedTemplate = lines.join('\n');
  
  console.log("🔄 Final template:", updatedTemplate);
  console.log("🔄 updateTemplateFromTree END");
  return updatedTemplate;
}
