// src/hooks/useDictionaryManager.ts
import { useState } from "react";
import { useAppDispatch, useAppSelector  } from "../../app/hooks";
import { addCustomWord, selectUser  } from "../.././features/userSlice";
import centralDictionary from "../../data/central-dictionary.json";

export interface DictionaryManager {
  getMergedDictionary: () => string[];
  addToPersonalDictionary: (term: string) => void;
}

export const useDictionaryManager = (): DictionaryManager => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);

  const addToPersonalDictionary = (term: string) => {
    if (!user?.wordlist.includes(term)) {
      if (user) {
        dispatch(addCustomWord({ uid: user.uid, word: term }));
      }
      console.log(`Added "${term}" to personal dictionary`);
    }
    else {
      console.log("term already exists");
    }
  };

  const getMergedDictionary = () => {
    const allTerms = Object.values(centralDictionary).flat();
    return Array.from(new Set([...allTerms, ...(user?.wordlist ?? [])]));
  };

  return { getMergedDictionary, addToPersonalDictionary };
};
