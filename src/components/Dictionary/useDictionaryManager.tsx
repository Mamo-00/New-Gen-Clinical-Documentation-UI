import { useState } from "react";
import centralDictionary from "../../data/central-dictionary.json";

interface DictionaryManager {
  getMergedDictionary: () => string[];
  addToPersonalDictionary: (term: string) => void;
}

export const useDictionaryManager = (): DictionaryManager => {
  // Initialize with the imported central dictionary and mock personal dictionary
  const [personalDictionary, setPersonalDictionary] = useState<string[]>(["myotonic", "dysplasia"]);

  // Add new terms to the personal dictionary
  const addToPersonalDictionary = (term: string) => {
    if (!personalDictionary.includes(term)) {
      setPersonalDictionary((prev) => [...prev, term]);
      console.log(`Added "${term}" to personal dictionary`);
      // TODO: Integrate with Firebase to persist the term
    }
  };

  // Merge central and personal dictionaries
  const getMergedDictionary = () => {
    const allTerms = Object.values(centralDictionary).flat();
    return Array.from(new Set([...allTerms, ...personalDictionary]));
  };

  return { getMergedDictionary, addToPersonalDictionary };
};


