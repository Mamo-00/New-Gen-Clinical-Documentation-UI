// src/features/user/userSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { RootState } from '../app/store';

// ------------------------------------------------------
// 1) Define the shape of our user data in Firestore
// ------------------------------------------------------
interface UserSettings {
  autocompleteEnabled: boolean;
  dimensions: { width: number; height: number };
  pinned: boolean;
  spellCheckEnabled: boolean;
  // You can add more settings as needed.
}

interface Template {
  name: string;
  content: string; 
}

export interface UserData {
  uid: string;
  name: string;
  field: string;  // e.g. "bioengineer", "pathologist", etc.
  wordlist: string[];
  templates: Template[];
  settings: UserSettings;
}

// ------------------------------------------------------
// 2) Define the Redux state shape for the user slice
// ------------------------------------------------------
export interface UserState {
  user: UserData | null;  // Currently logged-in user's data
  loading: boolean;
  error: string | null;
}

// ------------------------------------------------------
// 3) Initial state
// ------------------------------------------------------
const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
};

// Default settings to be used when creating a new user document
const defaultSettings: UserSettings = {
  autocompleteEnabled: true,
  dimensions: { width: 800, height: 600 },
  pinned: false,
  spellCheckEnabled: true,
};

// ------------------------------------------------------
// 4) Thunks for async operations
// ------------------------------------------------------

// 4.1) GOOGLE SIGN-IN THUNK
export const loginUserWithGoogle = createAsyncThunk(
  'user/loginUserWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      if (!result.user) {
        throw new Error('No user returned from sign-in.');
      }

      // Note: using collection "user" (singular) per your code.
      const userRef = doc(db, 'user', result.user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        const newUserData: UserData = {
          uid: result.user.uid,
          name: result.user.displayName ?? '',
          field: '',
          wordlist: [],
          templates: [],
          settings: { ...defaultSettings },
        };
        await setDoc(userRef, newUserData);
        return newUserData;
      } else {
        return { uid: result.user.uid, ...docSnap.data() } as UserData;
      }
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 4.2) EMAIL/PASSWORD SIGN-IN THUNK
export const loginUserWithEmailPassword = createAsyncThunk(
  'user/loginUserWithEmailPassword',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const userRef = doc(db, 'user', firebaseUser.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        const newUserData: UserData = {
          uid: firebaseUser.uid,
          name: firebaseUser.email ?? '',
          field: '',
          wordlist: [],
          templates: [],
          settings: { ...defaultSettings },
        };
        await setDoc(userRef, newUserData);
        return newUserData;
        
      } else {
        return { uid: firebaseUser.uid, ...docSnap.data() } as UserData;
      }
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// 4.3) LOGOUT THUNK
export const logoutUser = createAsyncThunk(
  'user/logoutUser',
  async () => {
    await signOut(auth);
    return null;
  }
);

/**
 * 4.4) Fetch user data from Firestore by UID
 */
export const fetchUserData = createAsyncThunk(
  "user/fetchUserData",
  async (uid: string, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      const docSnap = await getDoc(userRef);
      if (!docSnap.exists()) {
        throw new Error("User document does not exist");
      }
      return { uid, ...docSnap.data() } as UserData;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 4.5) Add a custom word to the user's wordlist
 */
export const addCustomWord = createAsyncThunk(
  "user/addCustomWord",
  async ({ uid, word }: { uid: string; word: string }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { wordlist: arrayUnion(word) });
      return word;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 4.6) Remove a custom word from the user's wordlist
 */
export const removeCustomWord = createAsyncThunk(
  "user/removeCustomWord",
  async ({ uid, word }: { uid: string; word: string }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { wordlist: arrayRemove(word) });
      return word;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 4.7) Add a new template to the user's templates array
 */
export const addTemplate = createAsyncThunk(
  "user/addTemplate",
  async ({ uid, template }: { uid: string; template: Template }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { templates: arrayUnion(template) });
      return template;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 4.8) Toggle the autocompleteEnabled setting
 */
export const toggleAutocompleteSetting = createAsyncThunk(
  "user/toggleAutocompleteSetting",
  async ({ uid, enabled }: { uid: string; enabled: boolean }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { "settings.autocompleteEnabled": enabled });
      return enabled;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// --------------------------------------------------------------------
// New thunks to update editor settings (except content and lastSaved)
// These now update the "settings" object in Firestore.
// --------------------------------------------------------------------

/**
 * Update the editor's dimensions
 */
export const updateEditorDimensions = createAsyncThunk(
  "user/updateEditorDimensions",
  async (
    { uid, dimensions }: { uid: string; dimensions: { width: number; height: number } },
    { rejectWithValue }
  ) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { "settings.dimensions": dimensions });
      return dimensions;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update the pinned state
 */
export const updateEditorPinned = createAsyncThunk(
  "user/updateEditorPinned",
  async ({ uid, pinned }: { uid: string; pinned: boolean }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { "settings.pinned": pinned });
      return pinned;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Update the spellCheckEnabled state
 */
export const updateEditorSpellCheckEnabled = createAsyncThunk(
  "user/updateEditorSpellCheckEnabled",
  async ({ uid, enabled }: { uid: string; enabled: boolean }, { rejectWithValue }) => {
    try {
      const userRef = doc(db, "user", uid);
      await updateDoc(userRef, { "settings.spellCheckEnabled": enabled });
      return enabled;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// ------------------------------------------------------
// 5) Create the Slice
// ------------------------------------------------------
const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    // Synchronous reducer to clear errors
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // --- Handle loginUserWithGoogle ---
    builder.addCase(loginUserWithGoogle.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUserWithGoogle.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      state.user = action.payload;
    });
    builder.addCase(loginUserWithGoogle.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // --- Handle loginUserWithEmailPassword ---
    builder.addCase(loginUserWithEmailPassword.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginUserWithEmailPassword.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      state.user = action.payload;
    });
    builder.addCase(loginUserWithEmailPassword.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // --- Handle logoutUser ---
    builder.addCase(logoutUser.fulfilled, (state) => {
      state.user = null;
      state.loading = false;
      state.error = null;
    });

    // --- Handle fetchUserData ---
    builder.addCase(fetchUserData.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchUserData.fulfilled, (state, action) => {
      state.loading = false;
      state.error = null;
      state.user = action.payload;
    });
    builder.addCase(fetchUserData.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // --- Handle addCustomWord ---
    builder.addCase(addCustomWord.fulfilled, (state, action) => {
      if (state.user) {
        state.user.wordlist.push(action.payload);
      }
    });

    // --- Handle removeCustomWord ---
    builder.addCase(removeCustomWord.fulfilled, (state, action) => {
      if (state.user) {
        state.user.wordlist = state.user.wordlist.filter((w) => w !== action.payload);
      }
    });

    // --- Handle addTemplate ---
    builder.addCase(addTemplate.fulfilled, (state, action) => {
      if (state.user) {
        state.user.templates.push(action.payload);
      }
    });

    // --- Handle toggleAutocompleteSetting ---
    builder.addCase(toggleAutocompleteSetting.fulfilled, (state, action) => {
      if (state.user) {
        state.user.settings.autocompleteEnabled = action.payload;
      }
    });

    // --- Handle updateEditorDimensions ---
    builder.addCase(updateEditorDimensions.fulfilled, (state, action) => {
      if (state.user) {
        state.user.settings.dimensions = action.payload;
      }
    });

    // --- Handle updateEditorPinned ---
    builder.addCase(updateEditorPinned.fulfilled, (state, action) => {
      if (state.user) {
        state.user.settings.pinned = action.payload;
      }
    });

    // --- Handle updateEditorSpellCheckEnabled ---
    builder.addCase(updateEditorSpellCheckEnabled.fulfilled, (state, action) => {
      if (state.user) {
        state.user.settings.spellCheckEnabled = action.payload;
      }
    });
  },
});

export const { clearError } = userSlice.actions;
export const selectUser = (state: RootState) => state.user.user;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;
export default userSlice.reducer;
