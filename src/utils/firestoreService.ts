// File: src/utils/firestoreService.ts

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; // Import the correctly initialized Firestore instance

/**
 * Fetches the user's personal dictionary from Firestore.
 *
 * @param userId The ID of the logged-in user.
 * @returns A promise resolving to an array of user-defined dictionary terms.
 */
export async function getFirestoreUserDictionary(userId: string): Promise<string[]> {
  try {
    // Get a reference to the user's Firestore document
    const userDocRef = doc(db, "users", userId);

    // Fetch the document snapshot
    const userDocSnap = await getDoc(userDocRef);

    // Check if the document exists
    if (!userDocSnap.exists()) {
      console.warn(`No dictionary found for user: ${userId}`);
      return []; // Return an empty array if no data exists
    }

    // Extract the user's personal dictionary from the Firestore document
    const userData = userDocSnap.data();
    return userData?.wordlist || [];
  } catch (error) {
    // Log any errors that occur during the fetching process
    console.error("Error fetching user dictionary from Firestore:", error);
    return []; // Return an empty array if an error occurs
  }
}
