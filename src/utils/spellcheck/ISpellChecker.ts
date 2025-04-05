export interface ISpellChecker {
  checkWord: (word: string) => boolean;
  addCustomWord: (word: string) => void;
  removeCustomWord: (word: string) => void;
  isCustomWord: (word: string) => boolean;
}