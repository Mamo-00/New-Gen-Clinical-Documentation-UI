import { useCallback, useMemo } from "react";
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import centralDictionary from "../../data/central-dictionary.json"

interface MedicalCompletion {
  label: string;
  type: string;
  info: string;
  boost: number;
}

export const useMedicalCompletions = () => {
  const isSpecialTerm = (term: string): boolean => {
    // Check if term contains any of these patterns:
    // - Has a slash (ER/PR)
    // - Has a hyphen with numbers (HER2, PD-L1)
    // - Is all uppercase and at least 2 chars (CT, MRI)
    // - Has numbers (Ki-67)
    return (
      term.includes('/') ||
      term.includes('-') ||
      /\d/.test(term) ||
      (term.length >= 2 && term === term.toUpperCase())
    );
  }

  const medicalCompletions: MedicalCompletion[] = useMemo(() => 
    Object.entries(centralDictionary).flatMap(
      ([category, terms]) =>
        (terms as string[]).map(term => ({
          label: isSpecialTerm(term) ? term : term.toLowerCase(),
          type: "medical-term",
          info: `Category: ${category}`,
          boost: 1
        }))
    ), []);

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
    let word = context.matchBefore(/\w+/);
    
    if (!word || (!context.explicit && word.text.length < 3)) {
      return null;
    }

    const startOfSentence = isStartOfSentence(context, word.from);
    const searchTerm = word.text.toLowerCase();

    const matchingCompletions = medicalCompletions
      .filter(completion => 
        completion.label.toLowerCase().startsWith(searchTerm)
      )
      .map(completion => ({
        ...completion,
        label: formatCompletionLabel(completion.label, startOfSentence)
      }));

    return {
      from: word.from,
      options: matchingCompletions,
      validFor: /^\w*$/
    };
  }, []);

  return { getCompletions, medicalCompletions };
};