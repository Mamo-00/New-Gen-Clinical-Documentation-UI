// src/app/store.ts
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import userReducer from "../features/userSlice";
import treeReducer from '../features/tree/treeSlice';

export const store = configureStore({
  reducer: combineReducers({
    user: userReducer,
    tree: treeReducer,
  }),
});

// Type helpers for Redux
export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
