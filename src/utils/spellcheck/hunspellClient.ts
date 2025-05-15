import { loadModule, Hunspell } from 'hunspell-asm';
let dictionaries: {
  nb: Hunspell;
  nn: Hunspell;
};
let customWords = new Set<string>();

export async function initializeHunspell() {
  const hunspellFactory = await loadModule();
  
  /* // Load base dictionaries
  const [nbAff, nbDic, nnAff, nnDic] = await Promise.all([
    fetch('/dictionaries/nb_NO.aff').then(r => r.text()),
    fetch('/dictionaries/nb_NO.dic').then(r => r.text()),
    fetch('/dictionaries/nn_NO.aff').then(r => r.text()),
    fetch('/dictionaries/nn_NO.dic').then(r => r.text()),
  ]); */

  const nbAffResponse = await fetch('/dictionaries/nb_NO.aff');
  const nbAff = await nbAffResponse.text();

  const nbDicResponse = await fetch('/dictionaries/nb_NO.dic');
  const nbDic = await nbDicResponse.text();

  const nnAffResponse = await fetch('/dictionaries/nn_NO.aff');
  const nnAff = await nnAffResponse.text();

  const nnDicResponse = await fetch('/dictionaries/nn_NO.dic');
  const nnDic = await nnDicResponse.text();

  dictionaries = {
    nb: hunspellFactory.create(nbAff, nbDic),
    nn: hunspellFactory.create(nnAff, nnDic)
  };
}

export function checkWord(word: string): boolean {
  if (!dictionaries?.nb || !dictionaries?.nn) {
    console.warn("Dictionaries not yet loaded; skipping check for:", word);
    return true; // or false, up to you
  }
  return (
    customWords.has(word.toLowerCase()) ||
    dictionaries.nb.spell(word) ||
    dictionaries.nn.spell(word)
  );
}


export function addCustomWord(word: string) {
  customWords.add(word.toLowerCase());
}

export function removeCustomWord(word: string) {
  customWords.delete(word.toLowerCase());
}

export function isCustomWord(word: string): boolean {
  return customWords.has(word.toLowerCase());
}
