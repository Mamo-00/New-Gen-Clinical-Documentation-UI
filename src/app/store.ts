// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../features/userSlice';
import templateReducer from '../features/templateSlice';
import treeReducer from '../features/treeSlice';
import mikroskopiReducer from '../features/mikroskopiSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    template: templateReducer,
    tree: treeReducer,
    mikroskopi: mikroskopiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;