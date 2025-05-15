import { useState, useEffect } from 'react';
import { loadAllMacroTemplates } from '../templates/macroTemplateService';

/**
 * A hook that provides a hint about available template categories for CodeMirror snippets.
 * This can be used to display a helper message to users about the template functionality.
 */
export const useMacroTemplateHint = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplateCategories = async () => {
      try {
        setIsLoading(true);
        const templates = await loadAllMacroTemplates();
        
        // Extract unique categories
        const uniqueCategories = Array.from(
          new Set(templates.map(template => template.category))
        );
        
        setCategories(uniqueCategories);
        setError(null);
      } catch (err) {
        console.error('Error loading template categories:', err);
        setError('Failed to load template categories');
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplateCategories();
  }, []);

  /**
   * Generates a hint message based on available template categories
   */
  const getTemplateHint = (): string => {
    if (isLoading) return 'Loading template suggestions...';
    if (error) return 'Templates are currently unavailable.';
    if (categories.length === 0) return 'No templates are available.';

    const categoriesList = categories.join(', ');
    return `Type "template:" to access templates. Available categories: ${categoriesList}`;
  };

  /**
   * Returns example usage of the template syntax based on available categories
   */
  const getTemplateExamples = (): string[] => {
    if (categories.length === 0) return [];
    
    const examples: string[] = ['template:'];
    
    // Add examples for each category
    categories.forEach(category => {
      examples.push(`template:${category.toLowerCase()}`);
    });
    
    // Add a specific example if polypp category exists
    if (categories.includes('polypp')) {
      examples.push('template:polypp/POLY');
    } else if (categories.length > 0) {
      // Or use the first category as an example
      examples.push(`template:${categories[0].toLowerCase()}/`);
    }
    
    return examples;
  };

  return {
    categories,
    isLoading,
    error,
    getTemplateHint,
    getTemplateExamples
  };
}; 