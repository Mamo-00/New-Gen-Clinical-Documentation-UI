// src/utils/templates/updateTemplateFromTree.ts
import { FieldValue } from "../../components/Trees/utilities/treeTypes";

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
  console.log("🔄 Field values for update:", JSON.stringify(fieldValues, null, 2));
  
  // Log all indexed field keys
  const indexedFields = Object.keys(fieldValues).filter(key => key.includes("_"));
  console.log("🔄 Indexed fields:", JSON.stringify(indexedFields, null, 2));
  
  // First, handle countField separately to ensure consistency
  let updatedTemplate = originalTemplate;
  if (fieldValues.countField !== undefined) {
    updatedTemplate = updatedTemplate.replace(
      /\{\{\s*countField\s*\}\}/g,
      String(fieldValues.countField)
    );
  }
  
  // Get the final count to determine how many numbered lines we need
  const targetCount = Number(fieldValues.countField) || 0;
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
  
  // Parse all indexed fields to separate them by line number
  indexedFields.forEach(key => {
    const parts = key.split('_');
    if (parts.length >= 2) {
      const lineNum = parseInt(parts[parts.length - 1]);
      if (!isNaN(lineNum)) {
        const baseField = parts[0];
        if (!lineValueMap[lineNum]) {
          lineValueMap[lineNum] = {};
        }
        lineValueMap[lineNum][baseField] = fieldValues[key];
      }
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
          
          // Always prioritize indexed values for numbered lines
          const indexedKey = `${placeholder}_${lineNum}`;
          
          // First check if we have a specific value for this line in our map
          if (lineValueMap[lineNum] && lineValueMap[lineNum][placeholder] !== undefined) {
            const lineValue = lineValueMap[lineNum][placeholder];
            console.log(`🔄 Line ${lineNum}: Replacing {{${placeholder}}} with mapped value ${JSON.stringify(lineValue)} from line map`);
            updatedLine = updatedLine.replace(
              new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
              String(lineValue)
            );
          }
          // Next try the direct indexed key
          else if (fieldValues[indexedKey] !== undefined) {
            console.log(`🔄 Line ${lineNum}: Replacing {{${placeholder}}} with indexed value ${JSON.stringify(fieldValues[indexedKey])} from ${indexedKey}`);
            updatedLine = updatedLine.replace(
              new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
              String(fieldValues[indexedKey])
            );
          } 
          // Fall back to non-indexed value as a last resort
          else if (fieldValues[placeholder] !== undefined) {
            console.log(`🔄 Line ${lineNum}: Replacing {{${placeholder}}} with non-indexed value ${JSON.stringify(fieldValues[placeholder])} (indexed value not found)`);
            updatedLine = updatedLine.replace(
              new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
              String(fieldValues[placeholder])
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
      
      if (fieldValues[placeholder] !== undefined) {
        console.log(`🔄 Non-numbered line: Replacing {{${placeholder}}} with value ${JSON.stringify(fieldValues[placeholder])}`);
        updatedLine = updatedLine.replace(
          new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
          String(fieldValues[placeholder])
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
        
        // Check for indexed value
        const indexedKey = `${placeholder}_${i}`;
        if (fieldValues[indexedKey] !== undefined) {
          console.log(`🔄 New line ${i}: Replacing {{${placeholder}}} with indexed value ${JSON.stringify(fieldValues[indexedKey])}`);
          newLine = newLine.replace(
            new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
            String(fieldValues[indexedKey])
          );
        } else if (fieldValues[placeholder] !== undefined) {
          // Fall back to non-indexed value
          console.log(`🔄 New line ${i}: Replacing {{${placeholder}}} with non-indexed value ${JSON.stringify(fieldValues[placeholder])}`);
          newLine = newLine.replace(
            new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
            String(fieldValues[placeholder])
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
