import React, { useEffect } from "react";

import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EditorProvider } from "./context/EditorContext";
import ResizableDialog from "./components/ResizableDialog";
import LoginPage from "./components/Login/LoginPage";
import { useAppSelector, useAppDispatch } from "./app/hooks";
import { fetchUserData, logoutUser, selectUser } from "./features/userSlice";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";

const App: React.FC = () => {
  const user = useAppSelector(selectUser);
  const dispatch = useAppDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Fetch user data from Firestore
        dispatch(fetchUserData(firebaseUser.uid));
      } else {
        // User is signed out
        dispatch(logoutUser()); // Ensure to clear user state
      }
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, [dispatch]);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EditorProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={user ? <ResizableDialog /> : <Navigate to="/login" />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </BrowserRouter>
      </EditorProvider>
    </ThemeProvider>
  );
};

export default App;
