// src/app/store.ts
import { configureStore } from '@reduxjs/toolkit';
import userReducer from '../features/userSlice';
import templateReducer from '../features/templateSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    template: templateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;