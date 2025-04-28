import { FieldValue } from "../../components/Trees/utilities/treeTypes";

// Configure whether debugging is enabled globally
let debugEnabled = false;

/**
 * Debug logger utility that conditionally logs debug information
 * when debugging is enabled.
 */
export const debugLogger = {
  /**
   * Enable or disable debug logging
   * @param enabled Whether debug logging should be enabled
   */
  setEnabled: (enabled: boolean): void => {
    debugEnabled = enabled;
    console.log(`Debug logging is now ${enabled ? 'enabled' : 'disabled'}`);
  },

  /**
   * Check if debug logging is enabled
   */
  isEnabled: (): boolean => debugEnabled,

  /**
   * Log a message with an optional group of related information
   * @param message The message to log
   * @param data Optional data to include as a group
   */
  log: (message: string, data?: any): void => {
    if (!debugEnabled) return;
    
    if (data) {
      console.group(message);
      console.log(data);
      console.groupEnd();
    } else {
      console.log(message);
    }
  },

  /**
   * Log information about field values in a tree
   * @param message The message to log
   * @param values The field values map
   * @param includeAll Whether to include all values or just show the count
   */
  logValues: (
    message: string,
    values: Record<string, FieldValue>,
    includeAll = false
  ): void => {
    if (!debugEnabled) return;
    
    const count = Object.keys(values).length;
    const valuesPreview = includeAll 
      ? values 
      : {
          count,
          sample: Object.entries(values).slice(0, 5).reduce(
            (acc, [key, value]) => ({...acc, [key]: value}),
            {}
          ),
          keysPreview: Object.keys(values).slice(0, 10)
        };
    
    console.group(`${message} (${count} values)`);
    console.log(valuesPreview);
    console.groupEnd();
  },

  /**
   * Log template updates with before and after comparisons
   * @param before The template before update
   * @param after The template after update
   */
  logTemplateUpdate: (before: string, after: string): void => {
    if (!debugEnabled) return;
    
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    console.group(`Template Update: ${beforeLines.length} → ${afterLines.length} lines`);
    
    // Show the first few lines
    console.log('Before (first 5 lines):');
    console.log(beforeLines.slice(0, 5).join('\n'));
    
    console.log('After (first 5 lines):');
    console.log(afterLines.slice(0, 5).join('\n'));
    
    // Check for differences
    const maxLines = Math.max(beforeLines.length, afterLines.length);
    const differences = [];
    
    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i] || '';
      const afterLine = afterLines[i] || '';
      
      if (beforeLine !== afterLine) {
        differences.push({
          lineNumber: i + 1,
          before: beforeLine,
          after: afterLine
        });
      }
    }
    
    // Show differences
    if (differences.length > 0) {
      console.log(`Found ${differences.length} differences:`);
      differences.slice(0, 10).forEach(diff => {
        console.log(`Line ${diff.lineNumber}:`);
        console.log(`- ${diff.before}`);
        console.log(`+ ${diff.after}`);
      });
      
      if (differences.length > 10) {
        console.log(`... and ${differences.length - 10} more differences`);
      }
    } else {
      console.log('No differences found in the template content.');
    }
    
    console.groupEnd();
  }
};




export default debugLogger; 