// SignInUser.tsx contains the login form with email/password fields and calls authService.js

import { AppProvider, SignInPage } from '@toolpad/core';
import type { AuthProvider } from '@toolpad/core';
import { createTheme } from '@mui/material/styles';
import { signInUser, signInWithGoogle } from '../../services/authService';
import { Dialog } from '@mui/material';

// The following OAuth providers that we can support
const providers = [
  { id: 'credentials', name: 'Email & Password' },
  { id: 'google', name: 'Google' },
];

// Theme for SignInPage
const theme = createTheme({
  palette: {
    primary: { main: '#ffffff' },
    secondary: { main: '#000000' },
  },
});

// signIn function to check for provider and run the corresponding function
async function signIn(provider: AuthProvider, formData?: any) {
  try {
    if (provider.id === 'credentials') {
      await signInUser(formData.email, formData.password);
      return { type: 'success', redirectUrl: '/' };
    }
    if (provider.id === 'google') {
      await signInWithGoogle();
      return { type: 'success', redirectUrl: '/' };
    }
    return { type: 'error', error: `Provider '${provider.id}' not implemented` };
  } catch (e: any) {
    return { type: 'error', error: e?.message ?? 'Sign-in failed' };
  }
}

// Material UI SignUp Popup
type SignInPopupProps = {
  open: boolean;
  onClose: () => void;
};

export default function SignInPopup({ open, onClose }: SignInPopupProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <AppProvider theme={theme}>
        <SignInPage signIn={signIn} providers={providers} />
      </AppProvider>
    </Dialog>
  );
}
