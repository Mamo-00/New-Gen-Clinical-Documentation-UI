// File: src/utils/dictionaryLoader.ts

import { getFirestoreUserDictionary } from "./firestoreService";
import centralDictionary from "../data/central-dictionary.json";

// Define the Norwegian central dictionary as a static array
// This dictionary contains common pathology terms in Norwegian


/**
 * Load the central dictionary and merge it with the user's personal dictionary.
 * This function retrieves the user's custom terms from Firestore,
 * combines them with the predefined central dictionary, and removes duplicates.
 *
 * @param userId The ID of the logged-in user.
 * @returns A promise resolving to the merged dictionary (central + user-specific).
 */
export async function loadMergedDictionary(userId: string): Promise<string[]> {
  try {
    // Fetch the user's personal dictionary from Firestore using the helper function
    const userDictionary = await getFirestoreUserDictionary(userId);

    // Merge the central dictionary with the user's personal dictionary
    // The Set constructor ensures that the resulting dictionary has unique entries
    const mergedDictionary = Array.from(new Set([...centralDictionary.terms, ...userDictionary]));

    // Return the combined dictionary
    return mergedDictionary;
  } catch (error) {
    // Log an error message to the console if the dictionary loading process fails
    console.error("Failed to load dictionaries:", error);

    // Re-throw the error to ensure it can be handled by the calling function
    throw error;
  }
}
