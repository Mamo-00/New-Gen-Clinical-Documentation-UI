import { templates as availableTemplates } from "./templateManifest";
import { convertTemplateToSnippet } from "./snippetUtils";

export interface MacroTemplate {
  name: string;
  category: string;
  templateText: string;
  snippet: string;
  originalText?: string;
}

/**
 * Cache for loaded templates to avoid repeated fetches
 */
let templateCache: MacroTemplate[] = [];

/**
 * Loads all macro templates from the template manifest
 * and converts them to CodeMirror snippets
 */
export async function loadAllMacroTemplates(): Promise<MacroTemplate[]> {
  if (templateCache.length > 0) {
    return templateCache;
  }

  const loadedTemplates: MacroTemplate[] = [];

  for (const template of availableTemplates) {
    try {
      const response = await fetch(template.url);
      if (!response.ok) {
        console.error(`Failed to load template: ${template.name}`);
        continue;
      }
      
      const templateText = await response.text();
      const snippet = convertTemplateToSnippet(templateText);
      
      loadedTemplates.push({
        name: template.name,
        category: template.category,
        templateText,
        snippet
      });
    } catch (error) {
      console.error(`Error loading template ${template.name}:`, error);
    }
  }

  // Cache the templates for future use
  templateCache = loadedTemplates;
  return loadedTemplates;
}

/**
 * Get templates filtered by category
 */
export async function getTemplatesByCategory(category: string): Promise<MacroTemplate[]> {
  const templates = await loadAllMacroTemplates();
  return templates.filter(template => template.category.toLowerCase() === category.toLowerCase());
}

/**
 * Search templates by name
 */
export async function searchTemplates(searchTerm: string): Promise<MacroTemplate[]> {
  const templates = await loadAllMacroTemplates();
  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return templates.filter(template => 
    template.name.toLowerCase().includes(lowerSearchTerm) || 
    template.category.toLowerCase().includes(lowerSearchTerm)
  );
}

/**
 * Group templates by category
 */
export async function getTemplatesGroupedByCategory(): Promise<Record<string, MacroTemplate[]>> {
  const templates = await loadAllMacroTemplates();
  
  return templates.reduce((grouped, template) => {
    const category = template.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(template);
    return grouped;
  }, {} as Record<string, MacroTemplate[]>);
}

/**
 * Clear the template cache to force reload
 */
export function clearTemplateCache(): void {
  templateCache = [];
} 