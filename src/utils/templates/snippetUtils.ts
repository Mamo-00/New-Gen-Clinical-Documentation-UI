import { snippetCompletion } from "@codemirror/autocomplete";

/**
 * Convert a user template with placeholders {{...}} into
 * CodeMirror snippet placeholders: ${n:...}.
 */
export function convertTemplateToSnippet(template: string): string {
  // For now, just return the template as is - we may add more complex conversion later
  return template;
}

/**
 * Create a snippet completion from a string that already has
 * snippet placeholders in it (e.g., "Hello ${1:Name}").
 */
export function createSnippetCompletion(snippetText: string, label = "Snippet") {
  return snippetCompletion(snippetText, {
    label,
    type: "snippet",
  });
}

/**
 * Check if the provided text matches the template trigger pattern.
 * This can be used to proactively check for template: prefix
 * in text to trigger completions.
 */
export function matchTemplatePrefix(text: string): { 
  category?: string;
  name?: string;
} {
  if (!text.startsWith('template:')) {
    return {};
  }

  // Remove the template: prefix
  const parts = text.substring('template:'.length).split('/');
  const categoryPart = parts[0] || ""; // Category part (e.g., "polypp")
  const namePart = parts[1] || ""; // Name part (e.g., "POLY")
  
  const result = {
    category: categoryPart || undefined,
    name: namePart || undefined
  };
  
  return result;
}

/**
 * Detect if text contains a template trigger, which would warrant
 * showing template completions. This is useful for adding specialized
 * event handlers to detect when a user is trying to use templates.
 */
export function hasTemplatePrefix(text: string): boolean {
  const result = text.indexOf('template:') > -1;
  return result;
}
