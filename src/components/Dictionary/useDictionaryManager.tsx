// src/hooks/useDictionaryManager.ts
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { selectUser, addCustomWord } from '../../features/userSlice';
import centralDictionary from '../../data/dictionaries/central-dictionary.json';

export interface DictionaryManager {
  getMergedDictionary: () => string[];
  addToPersonalDictionary: (term: string) => void;
  personalDictionary: string[];
}

export const useDictionaryManager = (): DictionaryManager => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const personalDictionary = user?.wordlist || [];

  const addToPersonalDictionary = (term: string) => {
    if (user && !personalDictionary.includes(term)) {
      dispatch(addCustomWord({ uid: user.uid, word: term }));
    }
  };

  const getMergedDictionary = () => {
    // Merge central dictionary (assumed to be an object whose values are arrays)
    const allTerms = Object.values(centralDictionary).flat();
    return Array.from(new Set([...allTerms, ...personalDictionary]));
  };

  return { getMergedDictionary, addToPersonalDictionary, personalDictionary };
};
