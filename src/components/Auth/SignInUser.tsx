// SignInUser.tsx contains the login form with email/password fields and calls authService.js

import { signInUser, signInWithGoogle } from '../../services/authService';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  TextField,
  Button,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Google as GoogleIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import * as React from 'react';

type SignInPopupProps = {
  open: boolean;
  onClose: () => void;
};

export default function SignInPopup({ open, onClose }: SignInPopupProps) {
  // Form input useStates (String)
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  // Show form data useStates (Boolean)
  const [showPassword, setShowPassword] = React.useState(false);
  // Output useStates (Boolean / Error: String)
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check for:
  // Email entered
  // Password entered
  const canSubmit = email.trim().length > 0 && password.length >= 6 && !submitting;

  // Handle registration with email + password
  async function handleEmailSignIn(e: React.FormEvent) {
    // Prevent page refresh and losing form state
    e.preventDefault();
    // Clear any previous errors
    setError(null);

    // Check using canSubmit
    if (!canSubmit) return;

    try {
      // Show loading state and disable buttons
      setSubmitting(true);
      // Call Firebase auth
      await signInUser(email.trim(), password);
      // Close popup
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  // Handle registration with Google OAuth
  async function handleGoogle() {
    // Clear any previous errors
    setError(null);

    try {
      setSubmitting(true);
      // Call Firebase auth
      await signInWithGoogle();
      // Close popup
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Google sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Dialog popup for sign-in */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth='xs'>
        <DialogTitle>Welcome back</DialogTitle>
        <DialogContent>
          {/* Sign-in form container */}
          <Stack component='form' onSubmit={handleEmailSignIn} spacing={2} sx={{ mt: 1 }}>
            {error && <Alert severity='error'>{error}</Alert>}

            {/* Google OAuth sign-in button */}
            <Button
              onClick={handleGoogle}
              variant='outlined'
              startIcon={<GoogleIcon />}
              disabled={submitting}
            >
              Continue with Google
            </Button>

            <div style={{ opacity: 0.6, textAlign: 'center' }}>Or</div>

            {/* Email input field */}
            <TextField
              label='Email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete='email'
              required
              fullWidth
              error={email.length > 0 && !email.includes('@')}
              helperText={email.length > 0 && !email.includes('@') ? 'Enter a valid email' : ' '}
            />

            {/* Password input field with show/hide toggle */}
            <TextField
              label='Password'
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete='current-password'
              required
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position='end'>
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      edge='end'
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Submit button for email/password sign-in */}
            <Button type='submit' variant='contained' disabled={!canSubmit}>
              {submitting ? 'Signing in…' : 'Sign in with Email'}
            </Button>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
