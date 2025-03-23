// src/pages/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Hook for navigation
import {
  Container,
  Stack,
  Button,
  TextField,
  Typography,
} from '@mui/material';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  loginUserWithGoogle,
  loginUserWithEmailPassword,
  selectUser,
  selectUserError,
  selectUserLoading,
  clearError,
} from '../../features/userSlice';

const LoginPage: React.FC = () => {
  const navigate = useNavigate(); // Allows us to programmatically navigate
  const dispatch = useAppDispatch();

  // Local state for email and password input
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Access Redux state for user, error messages, and loading status
  const user = useAppSelector(selectUser);
  const error = useAppSelector(selectUserError);
  const loading = useAppSelector(selectUserLoading);

  // If user is logged in, navigate to  page
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Handler for Google sign-in
  const handleGoogleSignIn = async () => {
    // Clear any previous errors
    dispatch(clearError());
    const resultAction = await dispatch(loginUserWithGoogle());
    if (loginUserWithGoogle.rejected.match(resultAction)) {
      // Error is handled via Redux state; UI will display it below
    }
    // Successful login will trigger useEffect to navigate to /
  };

  // Handler for email/password sign-in
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const resultAction = await dispatch(
      loginUserWithEmailPassword({ email, password })
    );
    if (loginUserWithEmailPassword.rejected.match(resultAction)) {
      // Error will be set in Redux state
    }
  };

  return (
    <Container maxWidth="xs">
      <Stack spacing={3} mt={5}>
        <Typography variant="h4" align="center">
          Login
        </Typography>

        {/* Google Sign-In Button */}
        <Button
          variant="contained"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          Sign in with Google
        </Button>

        <Typography variant="body1" align="center">
          or
        </Typography>

        {/* Email/Password Sign-In Form */}
        <form onSubmit={handleEmailSignIn}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" variant="contained" disabled={loading}>
              Sign in with Email
            </Button>
          </Stack>
        </form>

        {/* Display authentication error, if any */}
        {error && (
          <Typography color="error" variant="body2" align="center">
            {error}
          </Typography>
        )}
      </Stack>
    </Container>
  );
};

export default LoginPage;
