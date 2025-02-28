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
  console.log("nb_NO.aff fetch status:", nbAffResponse.status);
  const nbAff = await nbAffResponse.text();
  console.log("nbAff length:", nbAff.length);

  const nbDicResponse = await fetch('/dictionaries/nb_NO.dic');
  console.log("nb_NO.aff fetch status:", nbDicResponse.status);
  const nbDic = await nbDicResponse.text();
  console.log("nbDic length:", nbDic.length);

  const nnAffResponse = await fetch('/dictionaries/nn_NO.aff');
  console.log("nb_NO.aff fetch status:", nnAffResponse.status);
  const nnAff = await nnAffResponse.text();
  console.log("nnAff length:", nnAff.length);

  const nnDicResponse = await fetch('/dictionaries/nn_NO.dic');
  console.log("nb_NO.aff fetch status:", nnDicResponse.status);
  const nnDic = await nnDicResponse.text();
  console.log("nnDic length:", nnDic.length);

  dictionaries = {
    nb: hunspellFactory.create(nbAff, nbDic),
    nn: hunspellFactory.create(nnAff, nnDic)
  };
  console.log("Dictionaries created:", dictionaries);
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
