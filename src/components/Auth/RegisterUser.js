import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// RegisterUser.tsx contains the register form with email/password fields and calls authService.js
import { registerUser, signInWithGoogle } from '../../services/authService';
import { Dialog, DialogTitle, DialogContent, Stack, TextField, Button, Alert, IconButton, InputAdornment, } from '@mui/material';
import { Google as GoogleIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import * as React from 'react';
import { INTERNATIONAL_UNIS, NZ_UNIS } from './Universities';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
export default function RegisterUser({ open, onClose }) {
    // Form input useStates (String)
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirm, setConfirm] = React.useState('');
    // Show form data useStates (Boolean)
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirm, setShowConfirm] = React.useState(false);
    // Output useStates (Boolean / Error: String)
    const [submitting, setSubmitting] = React.useState(false);
    const [error, setError] = React.useState(null);
    // Password check for matching
    const passwordsMatch = confirm === '' || password === confirm;
    // University registration
    const [university, setUniversity] = React.useState('');
    const [uniTouched, setUniTouched] = React.useState(false);
    // Derive the label for the selected university (use both groups)
    const ALL_UNIS = React.useMemo(() => [...INTERNATIONAL_UNIS, ...NZ_UNIS], []);
    const uniLabel = React.useMemo(() => ALL_UNIS.find((u) => u.value === university)?.label ?? university, [ALL_UNIS, university]);
    // Check for:
    // Email entered
    // Matching password and confirm password entry,
    // Minimum password length
    const canSubmit = email.trim().length > 0 &&
        password.length >= 6 &&
        (passwordsMatch || confirm.length === 0) &&
        university.trim().length > 0 &&
        !submitting;
    // Handle registration with email + password
    async function handleEmailRegister(e) {
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
            await registerUser(email.trim(), password, {
                university: { value: university, label: uniLabel },
                friends: [],
            });
            // Close popup
            onClose();
        }
        catch (err) {
            setError(err?.message ?? 'Registration failed');
        }
        finally {
            setSubmitting(false);
        }
    }
    // Handle registration with Google OAuth
    async function handleGoogle() {
        // Clear any previous errors
        setError(null);
        // Require a university selection before Google sign-in too
        if (!university.trim()) {
            setError('Please select your university before continuing with Google.');
            return;
        }
        try {
            setSubmitting(true);
            // Call Firebase auth
            await signInWithGoogle({
                university: { value: university, label: uniLabel },
            });
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
    return (_jsx(_Fragment, { children: _jsxs(Dialog, { open: open, onClose: onClose, maxWidth: 'xs', fullWidth: true, children: [_jsx(DialogTitle, { children: "Create your account" }), _jsx(DialogContent, { children: _jsxs(Stack, { component: 'form', onSubmit: handleEmailRegister, spacing: 2, sx: { mt: 1 }, children: [error && _jsx(Alert, { severity: 'error', children: error }), _jsx(Button, { onClick: handleGoogle, variant: 'outlined', startIcon: _jsx(GoogleIcon, {}), disabled: submitting, children: "Continue with Google" }), _jsx("div", { style: { opacity: 0.6, textAlign: 'center' }, children: "Or" }), _jsxs(TextField, { select: true, label: 'University', value: university, onChange: (e) => setUniversity(e.target.value), onBlur: () => setUniTouched(true), required: true, fullWidth: true, error: uniTouched && !university, helperText: uniTouched && !university ? 'Select your university' : ' ', SelectProps: {
                                    MenuProps: { PaperProps: { style: { maxHeight: 360 } } }, // optional: limit menu height
                                }, children: [_jsx(ListSubheader, { disableSticky: true, children: "International" }), INTERNATIONAL_UNIS.map((u) => (_jsx(MenuItem, { value: u.value, children: u.label }, u.value))), _jsx(ListSubheader, { disableSticky: true, children: "New Zealand" }), NZ_UNIS.map((u) => (_jsx(MenuItem, { value: u.value, children: u.label }, u.value)))] }), _jsx(TextField, { label: 'Email', type: 'email', value: email, onChange: (e) => setEmail(e.target.value), autoComplete: 'email', required: true, fullWidth: true }), _jsx(TextField, { label: 'Password', type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), autoComplete: 'new-password', required: true, fullWidth: true, error: password.length > 0 && password.length < 6, helperText: password.length > 0 && password.length < 6
                                    ? 'Password must be at least 6 characters'
                                    : 'At least 6 characters', InputProps: {
                                    endAdornment: (_jsx(InputAdornment, { position: 'end', children: _jsx(IconButton, { "aria-label": showPassword ? 'Hide password' : 'Show password', onClick: () => setShowPassword((v) => !v), edge: 'end', children: showPassword ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                } }), _jsx(TextField, { label: 'Confirm password', type: showConfirm ? 'text' : 'password', value: confirm, onChange: (e) => setConfirm(e.target.value), autoComplete: 'new-password', required: true, fullWidth: true, error: confirm.length > 0 && !passwordsMatch, helperText: !passwordsMatch ? 'Passwords do not match' : ' ', InputProps: {
                                    endAdornment: (_jsx(InputAdornment, { position: 'end', children: _jsx(IconButton, { "aria-label": showConfirm ? 'Hide password' : 'Show password', onClick: () => setShowConfirm((v) => !v), edge: 'end', children: showConfirm ? _jsx(VisibilityOff, {}) : _jsx(Visibility, {}) }) })),
                                } }), _jsx(Button, { type: 'submit', variant: 'contained', disabled: !canSubmit, children: submitting ? 'Creating…' : 'Create account with Email' })] }) })] }) }));
}
