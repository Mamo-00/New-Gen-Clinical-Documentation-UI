import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import {
  CompletionContext,
  CompletionResult,
  snippetCompletion,
} from "@codemirror/autocomplete";
import enhancedDictionary from "../../data/dictionaries/enhanced-dictionary.json";
import {
  loadAllMacroTemplates,
  MacroTemplate,
} from "../../utils/templates/macroTemplateService";
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
    template: null,
  });

  // Load all macro templates on component mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await loadAllMacroTemplates();
        setMacroTemplates(templates);
        setTemplatesLoaded(true);
      } catch (error) {
        console.error("Failed to load macro templates:", error);
      }
    };

    loadTemplates();
  }, []);

  const isSpecialTerm = (term: string): boolean => {
    return (
      term.includes("/") ||
      term.includes("-") ||
      /\d/.test(term) ||
      (term.length >= 2 && term === term.toUpperCase())
    );
  };

  const medicalCompletions: MedicalCompletion[] = useMemo(() => {
    // Handle autocomplete terms
    const termCompletions =
      enhancedDictionary.autocompleteTerms?.map((term) => ({
        label: isSpecialTerm(term.label)
          ? term.label
          : term.label.toLowerCase(),
        type: term.type || "medical-term",
        info: term.info || "Medisinsk term",
        boost: 1,
      })) || [];

    return [...termCompletions];
  }, []);

  const isStartOfSentence = (
    context: CompletionContext,
    pos: number
  ): boolean => {
    const textBefore = context.state.doc.sliceString(
      Math.max(0, pos - 200),
      pos
    );
    if (!textBefore.trim()) return true;
    const lastChar = textBefore.trim().slice(-1);
    return [".", "!", "?", "\n"].includes(lastChar);
  };

  const formatCompletionLabel = (
    label: string,
    shouldCapitalize: boolean
  ): string => {
    // If it's detected as a special term, preserve its case
    if (isSpecialTerm(label)) {
      return label;
    }

    // Otherwise, handle sentence capitalization
    return shouldCapitalize
      ? label.charAt(0).toUpperCase() + label.slice(1)
      : label;
  };

  // Use ref for getCompletions to avoid regenerating on every render
  const getCompletions = useCallback(
    (context: CompletionContext): CompletionResult | null => {
      if (!templatesLoaded || macroTemplates.length === 0) {
        return null;
      }

      // Match snippet trigger patterns
      // Format: template:category/name or template:category or template:
      const snippetTrigger = context.matchBefore(
        /templat:([a-zA-Z0-9_]*)(\/([a-zA-Z0-9_]*))?/
      );

      if (snippetTrigger) {
        const triggerText = snippetTrigger.text.toLowerCase();
        const match = matchTemplatePrefix(triggerText);
        const categoryFilter = match.category || "";
        const nameFilter = match.name || "";

        // Filter templates based on user input
        const filteredTemplates = macroTemplates.filter((template) => {
          const matchesCategory =
            !categoryFilter ||
            template.category.toLowerCase().includes(categoryFilter);
          const matchesName =
            !nameFilter || template.name.toLowerCase().includes(nameFilter);
          return matchesCategory && matchesName;
        });

        // Convert templates to completions
        const options = filteredTemplates.map((template) => {
          return snippetCompletion(template.snippet, {
            label: template.name,
            detail: `${template.category} template`,
            type: "snippet",
            // Store the template data to use when selected
            info: template.templateText,
          });
        });

        // If we have options, return them
        if (options.length > 0) {
          const result = {
            from: snippetTrigger.from,
            options,
            // Use validFor to help with filtering as user types more
            validFor: /^template:[a-zA-Z0-9_]*(\/?[a-zA-Z0-9_]*)?$/,
          };
          return result;
        } else if (triggerText === "template:") {
          // If user just typed 'template:' but no templates are filtered,
          // return all templates as options
          const allOptions = macroTemplates.map((template) => {
            return snippetCompletion(template.snippet, {
              label: template.name,
              detail: `${template.category} template`,
              type: "snippet",
              info: template.templateText,
            });
          });

          if (allOptions.length > 0) {
            const result = {
              from: snippetTrigger.from,
              options: allOptions,
              validFor: /^template:[a-zA-Z0-9_]*(\/?[a-zA-Z0-9_]*)?$/,
            };
            console.groupEnd();
            return result;
          }
        }
      }

      let word = context.matchBefore(/\w+/);

      if (!word || (!context.explicit && word.text.length < 3)) {
        return null;
      }

      const startOfSentence = isStartOfSentence(context, word.from);
      const searchTerm = word.text.toLowerCase();

      const termCompletions = medicalCompletions
        .filter((completion) => {
          return completion.label.toLowerCase().startsWith(searchTerm);
        })
        .map((completion) => {
          return {
            ...completion,
            label: formatCompletionLabel(completion.label, startOfSentence),
          };
        });

      if (termCompletions.length > 0) {
        const result = {
          from: word.from,
          options: termCompletions,
          validFor: /^\w*$/,
        };
        console.groupEnd();
        return result;
      }

      console.groupEnd();
      return null;
    },
    [macroTemplates, medicalCompletions, templatesLoaded]
  );

  // This handler will be called by CodeMirror when a template snippet is selected
  const handleTemplateSelection = useCallback(
    (template: MacroTemplate) => {
      // Store the active template in the ref
      templateSelectionRef.current = {
        active: true,
        template: template,
      };

      // Schedule the update to happen outside of the current render cycle
      // This helps avoid React state updates during CodeMirror operations
      setTimeout(() => {
        if (
          templateSelectionRef.current.active &&
          templateSelectionRef.current.template
        ) {
          const selectedTemplate = templateSelectionRef.current.template;

          // Update the context with the selected template
          setSelectedTemplate({
            text: selectedTemplate.templateText,
            originalText:
              selectedTemplate.originalText || selectedTemplate.templateText,
            category: selectedTemplate.category,
            timestamp: Date.now(),
          });

          // Reset the active state
          templateSelectionRef.current.active = false;
          templateSelectionRef.current.template = null;
        }
        console.groupEnd();
      }, 100);
    },
    [setSelectedTemplate]
  );

  return {
    getCompletions,
    medicalCompletions,
    macroTemplates,
    handleTemplateSelection,
    templatesLoaded,
  };
};
