// services/SpellCheckerService.ts
import nspell from "nspell";

export class SpellCheckerService {
  private spellNB: nspell | null;
  private spellNN: nspell | null;
  private customWords: Set<string>;

  // The constructor is private to enforce async creation
  private constructor(
    spellNB: nspell | null,
    spellNN: nspell | null,
    customWords: Set<string>
  ) {
    this.spellNB = spellNB;
    this.spellNN = spellNN;
    this.customWords = customWords;
  }

  /**
   * Asynchronously creates an instance of SpellCheckerService.
   * @param nbAffUrl URL to the Bokmål .aff file.
   * @param nbDicUrl URL to the Bokmål .dic file.
   * @param nnAffUrl URL to the Nynorsk .aff file (optional).
   * @param nnDicUrl URL to the Nynorsk .dic file (optional).
   * @param customWordsArray Optional array of custom words.
   */
  public static async create(
    nbAffUrl: string,
    nbDicUrl: string,
    nnAffUrl?: string,
    nnDicUrl?: string,
    customWordsArray: string[] = []
  ): Promise<SpellCheckerService> {
    async function fetchText(url: string): Promise<string> {
      const response = await fetch(url);
      return response.text();
    }

    // Load Bokmål dictionary
    let spellNB: nspell | null = null;
    if (nbAffUrl && nbDicUrl) {
      const [nbAff, nbDic] = await Promise.all([
        fetchText(nbAffUrl),
        fetchText(nbDicUrl),
      ]);
      spellNB = nspell(nbAff, nbDic);
    }
    // Optionally load Nynorsk dictionary
    let spellNN: nspell | null = null;
    if (nnAffUrl && nnDicUrl) {
      const [nnAff, nnDic] = await Promise.all([
        fetchText(nnAffUrl),
        fetchText(nnDicUrl),
      ]);
      spellNN = nspell(nnAff, nnDic);
    }

    return new SpellCheckerService(
      spellNB,
      spellNN,
      new Set(customWordsArray.map((w) => w.toLowerCase()))
    );
  }

  /**
   * Checks whether a word is correct.
   * First, returns true if the word is in the custom dictionary.
   * Otherwise, checks both dictionaries (if available).
   * @param word The word to check.
   */
  public checkWord(word: string): boolean {
    const lowerWord = word.toLowerCase();

    // Check the custom dictionary first.
    if (this.customWords.has(lowerWord)) {
      
      return true;
    }

    // Check bokmål dictionary (if available).
    let nbResult = false;
    if (this.spellNB) {
      nbResult = this.spellNB.correct(word);
      
    }

    // Check Nynorsk dictionary (if available).
    let nnResult = false;
    if (this.spellNN) {
      nnResult = this.spellNN.correct(word);
      
    }

    if (nbResult || nnResult) {
      
        `"${word}" is accepted by ${nbResult ? "NB" : ""}${
          nbResult && nnResult ? " & " : ""
        }${nnResult ? "NN" : ""}`
      ;
    } 
    return nbResult || nnResult;
  }

  /**
   * Adds a new custom word.
   * (In a real app, you'd persist this change to Firebase.)
   * @param word The word to add.
   */
  public addCustomWord(word: string) {
    this.customWords.add(word.toLowerCase());
  }

  /**
   * Removes a custom word.
   * @param word The word to remove.
   */
  public removeCustomWord(word: string) {
    this.customWords.delete(word.toLowerCase());
  }

  /**
   * Checks if a word is in the custom dictionary.
   * @param word The word to check.
   */
  public isCustomWord(word: string): boolean {
    return this.customWords.has(word.toLowerCase());
  }
}
