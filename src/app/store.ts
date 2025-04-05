// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/userSlice";

export const store = configureStore({
  reducer: {
    user: userReducer,
  },
});

// Type helpers for Redux
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
