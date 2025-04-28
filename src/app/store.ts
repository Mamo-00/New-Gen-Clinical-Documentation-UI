// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../features/userSlice';
import templateReducer from '../features/templateSlice';
import treeReducer from '../features/treeSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    template: templateReducer,
    tree: treeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;