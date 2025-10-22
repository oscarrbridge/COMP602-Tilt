import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import './Settings.css';
import NavBar from '@components/NavBar/NavBar';
import { EmailAuthProvider, reauthenticateWithCredential, updateProfile, updatePassword, } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import { UNIVERSITY_OPTIONS } from '../../components/Auth/Universities';
export default function Settings() {
    // const navigate = useNavigate(); // not used currently
    const [settingsPage, setSettingsPage] = useState('general');
    const renderContent = () => {
        switch (settingsPage) {
            case 'account':
                return _jsx(Account, {});
            case 'general':
                return _jsx(General, {});
            default:
                return _jsx("p", { children: "..." });
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx(NavBar, {}), _jsx("div", { className: 'pageContainer', children: _jsxs("div", { className: 'innerComponents', children: [_jsxs("div", { className: 'leftMenu', children: [_jsx("h2", { children: "Category" }), _jsxs("div", { className: 'settingItems', children: [_jsx("p", { className: settingsPage === 'general' ? 'active' : '', onClick: () => setSettingsPage('general'), children: "General" }), _jsx("p", { className: settingsPage === 'account' ? 'active' : '', onClick: () => setSettingsPage('account'), children: "Account" })] })] }), _jsx("div", { className: 'rightMenu', children: renderContent() })] }) })] }));
}
function General() {
    const { user } = useUser();
    const [selected, setSelected] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [privateAccount, setPrivateAccount] = useState(false);
    // Load current settings
    useEffect(() => {
        if (!user)
            return;
        (async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                const data = snap.data();
                const uni = data?.university;
                if (uni?.value)
                    setSelected(uni.value);
                setPrivateAccount(data?.private ?? false); // Load privacy setting
            }
            catch { }
        })();
    }, [user]);
    const handleSave = async () => {
        if (!user)
            return setMessage('You must be logged in.');
        if (!selected)
            return setMessage('Please select a university.');
        const sel = UNIVERSITY_OPTIONS.find((u) => u.value === selected);
        if (!sel)
            return setMessage('Invalid selection.');
        try {
            setSaving(true);
            await updateDoc(doc(db, 'users', user.uid), {
                university: {
                    label: sel.label,
                    value: sel.value,
                    domains: sel.domains ?? [],
                    updatedAt: new Date(),
                },
                private: privateAccount, // <-- Save privacy setting
            });
            setMessage('✅ Settings updated!');
        }
        catch (e) {
            setMessage(`❌ ${e?.message || 'Failed to update'}`);
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsxs("div", { className: 'general-settings', children: [_jsx("h2", { children: "General Settings" }), _jsxs("div", { className: 'form-group', children: [_jsx("label", { children: "University" }), _jsxs("select", { value: selected, onChange: (e) => setSelected(e.target.value), children: [_jsx("option", { value: '', children: "-- Select your university --" }), UNIVERSITY_OPTIONS.map((u) => (_jsx("option", { value: u.value, children: u.label }, u.value)))] })] }), _jsx("div", { className: 'form-group', style: { marginTop: '1rem' }, children: _jsxs("label", { children: [_jsx("input", { type: 'checkbox', checked: privateAccount, onChange: (e) => setPrivateAccount(e.target.checked) }), "Make my account private (hide from friend search)"] }) }), _jsx("button", { onClick: handleSave, disabled: saving, children: saving ? 'Saving…' : 'Save Settings' }), message && _jsx("p", { style: { marginTop: 12 }, children: message })] }));
}
function Account() {
    const { user } = useUser();
    const [username, setUsername] = useState(user?.displayName || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [message, setMessage] = useState('');
    // Username change handler
    const handleUsernameChange = async () => {
        if (!user)
            return setMessage('You must be logged in.');
        try {
            await updateProfile(user, { displayName: username });
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { username });
            setMessage('✅ Username updated successfully!');
        }
        catch (error) {
            setMessage(`❌ Error updating username: ${error.message}`);
        }
    };
    // Password change handler
    const handlePasswordChange = async () => {
        if (!user)
            return setMessage('You must be logged in.');
        if (!currentPassword || !newPassword)
            return setMessage('Please fill both fields.');
        if (!user.email)
            return setMessage('No email on this account. Please re-login and try again.');
        try {
            // Reauthenticate
            const cred = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, cred);
            // Update password
            await updatePassword(user, newPassword);
            setMessage('✅ Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
        }
        catch (error) {
            if (error.code === 'auth/requires-recent-login') {
                setMessage('⚠️ Please log in again before changing your password.');
            }
            else {
                setMessage(`❌ ${error.message}`);
            }
        }
    };
    return (_jsxs("div", { className: 'account-settings', children: [_jsx("h2", { children: "Account Settings" }), _jsxs("div", { className: 'form-group', children: [_jsx("label", { children: "Username" }), _jsx("input", { type: 'text', value: username, onChange: (e) => setUsername(e.target.value), placeholder: 'Enter new username' }), _jsx("button", { onClick: handleUsernameChange, children: "Save Username" })] }), _jsxs("div", { className: 'form-group', children: [_jsx("label", { children: "Current Password" }), _jsx("input", { type: 'password', value: currentPassword, onChange: (e) => setCurrentPassword(e.target.value), placeholder: 'Enter current password' })] }), _jsxs("div", { className: 'form-group', children: [_jsx("label", { children: "New Password" }), _jsx("input", { type: 'password', value: newPassword, onChange: (e) => setNewPassword(e.target.value), placeholder: 'Enter new password' }), _jsx("button", { onClick: handlePasswordChange, children: "Update Password" })] }), message && _jsx("p", { style: { marginTop: '1rem', color: '#ccc' }, children: message })] }));
}
