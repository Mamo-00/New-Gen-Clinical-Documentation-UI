import { useCallback, useMemo } from "react";
import { CompletionContext, CompletionResult, snippetCompletion } from '@codemirror/autocomplete';
import enhancedDictionary from "../../data/dictionaries/enhanced-dictionary.json"
import { convertTemplateToSnippet } from "../../utils/templates/snippetUtils";

interface MedicalCompletion {
  label: string;
  type: string;
  info: string;
  boost: number;
}

export const useMedicalCompletions = () => {
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

  const getCompletions = useCallback((context: CompletionContext): CompletionResult | null => {

    const snippetTrigger = context.matchBefore(/template:/);
    if (snippetTrigger) {
      const userTemplate = "Lav, bredbaset polypp {{x}} mm, seriesnittes i {{#1}}.";
      const snippetText = convertTemplateToSnippet(userTemplate);
      const snippet = snippetCompletion(snippetText, {
        label: "Bredbaset polypp",
        detail: "Custom snippet",
        type: "snippet"
      });
      return {
        from: snippetTrigger.from,
        options: [snippet]
      };
    }

    let word = context.matchBefore(/\w+/);
    
    if (!word || (!context.explicit && word.text.length < 3)) {
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
    })

    return {
      from: word.from,
      options: termCompletions,
      validFor: /^\w*$/
    };
  }, []);

  return { getCompletions, medicalCompletions };
};