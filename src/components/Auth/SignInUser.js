import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// SignInUser.tsx contains the login form with email/password fields and calls authService.js
import { signInUser, signInWithGoogle } from '../../services/authService';
import { Dialog, DialogTitle, DialogContent, Stack, TextField, Button, Alert, IconButton, InputAdornment, } from '@mui/material';
import { Google as GoogleIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import * as React from 'react';
export default function SignInPopup({ open, onClose }) {
    // Form input useStates (String)
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    // Show form data useStates (Boolean)
    const [showPassword, setShowPassword] = React.useState(false);
    // Output useStates (Boolean / Error: String)
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);
    // Check for:
    // Email entered
    // Password entered
    const canSubmit = email.trim().length > 0 && password.length >= 6 && !submitting;
    // Handle registration with email + password
    async function handleEmailSignIn(e) {
        // Prevent page refresh and losing form state
        e.preventDefault();
        // Clear any previous errors
        setError(null);
        // Check using canSubmit
        if (!canSubmit)
            return;
        try {
            // Show loading state and disable buttons
            setSubmitting(true);
            // Call Firebase auth
            await signInUser(email.trim(), password);
            // Close popup
            onClose();
        }
        catch (err) {
            setError(err?.message ?? 'Sign in failed');
        }
        finally {
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
        }
        catch (err) {
            setError(err?.message ?? 'Google sign-in failed');
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsx(_Fragment, { children: _jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: 'xs', children: [_jsx(DialogTitle, { children: "Welcome back" }), _jsx(DialogContent, { children: _jsxs(Stack, { component: 'form', onSubmit: handleEmailSignIn, spacing: 2, sx: { mt: 1 }, children: [error && _jsx(Alert, { severity: 'error', children: error }), _jsx(Button, { onClick: handleGoogle, variant: 'outlined', startIcon: _jsx(GoogleIcon, {}), disabled: submitting, children: "Continue with Google" }), _jsx("div", { style: { opacity: 0.6, textAlign: 'center' }, children: "Or" }), _jsx(TextField, { label: 'Email', type: 'email', value: email, onChange: (e) => setEmail(e.target.value), autoComplete: 'email', required: true, fullWidth: true, error: email.length > 0 && !email.includes('@'), helperText: email.length > 0 && !email.includes('@') ? 'Enter a valid email' : ' ' }), _jsx(TextField, { label: 'Password', type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), autoComplete: 'current-password', required: true, fullWidth: true, InputProps: {
                                    endAdornment: (_jsx(InputAdornment, { position: 'end', children: _jsx(IconButton, { "aria-label": showPassword ? 'Hide password' : 'Show password', onClick: () => setShowPassword((v) => !v), edge: 'end', children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                } }), _jsx(Button, { type: 'submit', variant: 'contained', disabled: !canSubmit, children: submitting ? 'Signing in…' : 'Sign in with Email' })] }) })] }) }));
}
