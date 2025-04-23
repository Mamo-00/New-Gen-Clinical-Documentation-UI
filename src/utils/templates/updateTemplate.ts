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
  console.log("Field values for update:", fieldValues);
  
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
  
  // Sort by line number
  numberedLineIndices.sort((a, b) => a.lineNum - b.lineNum);
  
  // Get a template line for creating new lines if needed
  const templateLine = numberedLineIndices.length > 0 
    ? lines[numberedLineIndices[numberedLineIndices.length - 1].index] 
    : "";
  
  // Process each line to replace placeholders in the existing lines
  lines = lines.map((line, lineIndex) => {
    // Check if this is a numbered line
    const match = line.match(lineNumberPattern);
    if (match) {
      const lineNum = parseInt(match[1]);
      
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
          
          // Check for indexed value first
          const indexedKey = `${placeholder}_${lineNum}`;
          if (fieldValues[indexedKey] !== undefined) {
            updatedLine = updatedLine.replace(
              new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
              String(fieldValues[indexedKey])
            );
          } else if (fieldValues[placeholder] !== undefined) {
            // Fall back to non-indexed value
            updatedLine = updatedLine.replace(
              new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
              String(fieldValues[placeholder])
            );
          }
        }
        
        return updatedLine;
      }
      // Skip lines that should be removed (lineNum > targetCount)
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
        updatedLine = updatedLine.replace(
          new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
          String(fieldValues[placeholder])
        );
      }
    }
    
    return updatedLine;
  }).filter(line => line !== null) as string[]; // Remove null lines
  
  // Add new numbered lines if needed
  if (templateLine && targetCount > numberedLineIndices.length) {
    const lastExistingLineNum = numberedLineIndices.length > 0 
      ? numberedLineIndices[numberedLineIndices.length - 1].lineNum 
      : 0;
    
    for (let i = lastExistingLineNum + 1; i <= targetCount; i++) {
      // Create a new line based on the template line, but with updated line number
      let newLine = templateLine.replace(lineNumberPattern, `${i}:`);
      
      // Replace placeholders with their indexed values if available
      const placeholderPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
      let placeholderMatch;
      
      // Create a new RegExp for each replacement to avoid state issues
      const placeholderFinder = new RegExp(placeholderPattern);
      while ((placeholderMatch = placeholderFinder.exec(templateLine)) !== null) {
        const placeholder = placeholderMatch[1].trim();
        if (placeholder === "countField") continue; // Skip countField as it's already handled
        
        // Check for indexed value
        const indexedKey = `${placeholder}_${i}`;
        if (fieldValues[indexedKey] !== undefined) {
          newLine = newLine.replace(
            new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
            String(fieldValues[indexedKey])
          );
        } else if (fieldValues[placeholder] !== undefined) {
          // Fall back to non-indexed value
          newLine = newLine.replace(
            new RegExp(`\\{\\{\\s*${placeholder}\\s*\\}\\}`, 'g'),
            String(fieldValues[placeholder])
          );
        }
      }
      
      lines.push(newLine);
    }
  }
  
  // Rejoin the lines and return the updated template
  updatedTemplate = lines.join('\n');
  
  console.log("Updated template:", updatedTemplate);
  return updatedTemplate;
}
