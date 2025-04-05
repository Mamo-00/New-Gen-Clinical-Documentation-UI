import { snippetCompletion } from "@codemirror/autocomplete";

/**
 * Convert a user template with placeholders {{...}} into
 * CodeMirror snippet placeholders: ${n:...}.
 */
export function convertTemplateToSnippet(template: string): string {
  const placeholderRegex = /{{(.*?)}}/g;
  let placeholderIndex = 1;

  return template.replace(placeholderRegex, (_, placeholderContent) => {
    const snippet = `\${${placeholderIndex}:${placeholderContent.trim()}}`;
    placeholderIndex++;
    return snippet;
  });
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
