import React, { useEffect, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { theme } from "./theme";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EditorProvider } from "./context/EditorContext";
import LoginPage from "./pages/Login/LoginPage";
import { useAppSelector, useAppDispatch } from "./app/hooks";
import { fetchUserData, logoutUser, selectUser } from "./features/userSlice";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import MainPage from "./pages/Main/MainPage";
import LoadingSkeleton from "./components/LoadingSkeleton";

const App: React.FC = () => {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();
  const [authLoading, setAuthLoading] = useState(true); // Track loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser);

      if (firebaseUser) {
        await dispatch(fetchUserData(firebaseUser.uid)); // Fetch user data
      } else {
        dispatch(logoutUser()); // Ensure user state is cleared
      }

      setAuthLoading(false); // Mark authentication check as complete
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [dispatch]);

  // ✅ Show Skeleton UI while checking authentication
  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingSkeleton />
      </ThemeProvider>
    );
  }

  // ✅ Redirect logged-out users to /login
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EditorProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={user ? <MainPage /> : <Navigate to="/login" />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
          </Routes>
        </BrowserRouter>
      </EditorProvider>
    </ThemeProvider>
  );
};

export default App;
