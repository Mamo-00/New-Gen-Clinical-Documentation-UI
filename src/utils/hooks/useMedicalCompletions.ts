import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { CompletionContext, CompletionResult, snippetCompletion } from '@codemirror/autocomplete';
import enhancedDictionary from "../../data/dictionaries/enhanced-dictionary.json"
import { convertTemplateToSnippet } from "../../utils/templates/snippetUtils";
import { loadAllMacroTemplates, MacroTemplate } from "../../utils/templates/macroTemplateService";
import { useTemplate } from "../../context/TemplateContext";
import { matchTemplatePrefix } from "../templates/snippetUtils";

interface MedicalCompletion {
  label: string;
  type: string;
  info: string;
  boost: number;
}

export const useMedicalCompletions = () => {
  const { setSelectedTemplate } = useTemplate();
  const [macroTemplates, setMacroTemplates] = useState<MacroTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  
  // Use ref for template selection to avoid re-renders
  const templateSelectionRef = useRef<{
    active: boolean;
    template: MacroTemplate | null;
  }>({
    active: false,
    template: null
  });
  
  // Load all macro templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        console.log("Loading macro templates...");
        const templates = await loadAllMacroTemplates();
        console.log(`Loaded ${templates.length} templates:`, 
          templates.map(t => `${t.category}/${t.name}`).slice(0, 5).join(", ") + 
          (templates.length > 5 ? ` and ${templates.length - 5} more...` : ""));
        setMacroTemplates(templates);
        setTemplatesLoaded(true);
        console.log("Templates loaded successfully");
      } catch (error) {
        console.error("Failed to load macro templates:", error);
      }
    };
    
    loadTemplates();
  }, []);

  const isSpecialTerm = (term: string): boolean => {
    return (
      term.includes('/') ||
      term.includes('-') ||
      /\d/.test(term) ||
      (term.length >= 2 && term === term.toUpperCase())
    );
  }

  const medicalCompletions: MedicalCompletion[] = useMemo(() => {
    // Handle autocomplete terms
    const termCompletions = enhancedDictionary.autocompleteTerms?.map(term => ({
      label: isSpecialTerm(term.label) ? term.label : term.label.toLowerCase(),
      type: term.type || "medical-term",
      info: term.info || "Medisinsk term",
      boost: 1
    })) || [];
    
    return [...termCompletions];
  }, []);

  const isStartOfSentence = (context: CompletionContext, pos: number): boolean => {
    const textBefore = context.state.doc.sliceString(Math.max(0, pos - 200), pos);
    if (!textBefore.trim()) return true;
    const lastChar = textBefore.trim().slice(-1);
    return ['.', '!', '?', '\n'].includes(lastChar);
  }

  const formatCompletionLabel = (label: string, shouldCapitalize: boolean): string => {
    // If it's detected as a special term, preserve its case
    if (isSpecialTerm(label)) {
      return label;
    }
    
    // Otherwise, handle sentence capitalization
    return shouldCapitalize 
      ? label.charAt(0).toUpperCase() + label.slice(1)
      : label;
  }

  // Use ref for getCompletions to avoid regenerating on every render
  const getCompletions = useCallback((context: CompletionContext): CompletionResult | null => {
    console.group("AUTOCOMPLETE DEBUG");
    console.log("getCompletions called", { 
      explicit: context.explicit,
      position: context.pos,
      templatesLoaded: templatesLoaded, 
      templateCount: macroTemplates.length,
      docText: context.state.doc.sliceString(Math.max(0, context.pos - 20), context.pos)
    });
    
    if (!templatesLoaded || macroTemplates.length === 0) {
      console.log("Templates not loaded yet or empty, can't provide template completions");
      console.groupEnd();
      return null;
    }
    
    // Match snippet trigger patterns
    // Format: template:category/name or template:category or template:
    const snippetTrigger = context.matchBefore(/templat:([a-zA-Z0-9_]*)(\/([a-zA-Z0-9_]*))?/);
    
    if (snippetTrigger) {
      console.log(`Matched template trigger: "${snippetTrigger.text}" at pos ${snippetTrigger.from}`, {
        from: snippetTrigger.from,
        to: context.pos
      });
      
      const triggerText = snippetTrigger.text.toLowerCase();
      const match = matchTemplatePrefix(triggerText);
      const categoryFilter = match.category || '';
      const nameFilter = match.name || '';
      
      console.log(`Filtering templates - Category: "${categoryFilter}", Name: "${nameFilter}"`);
      
      // Filter templates based on user input
      const filteredTemplates = macroTemplates.filter(template => {
        const matchesCategory = !categoryFilter || template.category.toLowerCase().includes(categoryFilter);
        const matchesName = !nameFilter || template.name.toLowerCase().includes(nameFilter);
        return matchesCategory && matchesName;
      });
      
      console.log(`Filtered templates: ${filteredTemplates.length}`);
      
      // Convert templates to completions
      const options = filteredTemplates.map(template => {
        return snippetCompletion(template.snippet, {
          label: template.name,
          detail: `${template.category} template`,
          type: "snippet",
          // Store the template data to use when selected
          info: template.templateText
        });
      });
      
      // If we have options, return them
      if (options.length > 0) {
        console.log(`Returning ${options.length} template options`);
        const result = {
          from: snippetTrigger.from,
          options,
          // Use validFor to help with filtering as user types more
          validFor: /^template:[a-zA-Z0-9_]*(\/?[a-zA-Z0-9_]*)?$/
        };
        console.log("Return result:", result);
        console.groupEnd();
        return result;
      } else if (triggerText === "template:") {
        // If user just typed 'template:' but no templates are filtered,
        // return all templates as options
        console.log("Returning all templates as options");
        const allOptions = macroTemplates.map(template => {
          return snippetCompletion(template.snippet, {
            label: template.name,
            detail: `${template.category} template`,
            type: "snippet",
            info: template.templateText
          });
        });
        
        if (allOptions.length > 0) {
          const result = {
            from: snippetTrigger.from,
            options: allOptions,
            validFor: /^template:[a-zA-Z0-9_]*(\/?[a-zA-Z0-9_]*)?$/
          };
          console.log("Return result (all templates):", result);
          console.groupEnd();
          return result;
        }
      } else {
        console.log("No template options found");
      }
    }

    let word = context.matchBefore(/\w+/);
    
    if (!word || (!context.explicit && word.text.length < 3)) {
      console.log("No matching word or word too short", { word: word?.text, explicit: context.explicit });
      console.groupEnd();
      return null;
    }

    const startOfSentence = isStartOfSentence(context, word.from);
    const searchTerm = word.text.toLowerCase();

    const termCompletions = medicalCompletions.filter((completion) => {
      return completion.label.toLowerCase().startsWith(searchTerm)
    }).map((completion) => {
      return {
        ...completion,
        label: formatCompletionLabel(completion.label, startOfSentence)
      }
    });

    if (termCompletions.length > 0) {
      console.log(`Regular completion: ${word.text} -> ${termCompletions.length} results`);
      const result = {
        from: word.from,
        options: termCompletions,
        validFor: /^\w*$/
      };
      console.log("Return result (terms):", result);
      console.groupEnd();
      return result;
    }
    
    console.log("No completions found");
    console.groupEnd();
    return null;
  }, [macroTemplates, medicalCompletions, templatesLoaded]);

  // This handler will be called by CodeMirror when a template snippet is selected
  const handleTemplateSelection = useCallback((template: MacroTemplate) => {
    console.group("TEMPLATE SELECTION");
    console.log("Template selected:", template.name, {
      category: template.category,
      textLength: template.templateText?.length || 0,
      template
    });
    
    // Store the active template in the ref
    templateSelectionRef.current = {
      active: true,
      template: template
    };
    console.log("Updated template selection ref state:", templateSelectionRef.current);
    
    // Schedule the update to happen outside of the current render cycle
    // This helps avoid React state updates during CodeMirror operations
    setTimeout(() => {
      console.log("Template selection timeout fired");
      if (templateSelectionRef.current.active && templateSelectionRef.current.template) {
        const selectedTemplate = templateSelectionRef.current.template;
        
        console.log("Applying template selection:", selectedTemplate.name);
        // Update the context with the selected template
        setSelectedTemplate({
          text: selectedTemplate.templateText,
          originalText: selectedTemplate.originalText || selectedTemplate.templateText,
          category: selectedTemplate.category,
          timestamp: Date.now()
        });
        
        // Reset the active state
        templateSelectionRef.current.active = false;
        templateSelectionRef.current.template = null;
        console.log("Reset template selection ref state:", templateSelectionRef.current);
      } else {
        console.log("Template selection ref not active or no template:", templateSelectionRef.current);
      }
      console.groupEnd();
    }, 100);
  }, [setSelectedTemplate]);

  return { 
    getCompletions, 
    medicalCompletions,
    macroTemplates,
    handleTemplateSelection,
    templatesLoaded
  };
};