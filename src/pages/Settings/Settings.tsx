import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';
import NavBar from '@components/NavBar/NavBar';

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../Backend/firebase/firebaseConfig';
import { useUser } from '../../../Backend/firebase/UserFunctions';
import { UNIVERSITY_OPTIONS, type UniversityOption } from '../../components/Auth/Universities';

export default function Settings() {
  // const navigate = useNavigate(); // not used currently
  const [settingsPage, setSettingsPage] = useState<'account' | 'general'>('general');

  const renderContent = () => {
    switch (settingsPage) {
      case 'account':
        return <Account />;
      case 'general':
        return <General />;
      default:
        return <p>...</p>;
    }
  };

  return (
    <>
      <NavBar />
      <div className='pageContainer'>
        <div className='innerComponents'>
          <div className='leftMenu'>
            <h2>Category</h2>
            <div className='settingItems'>
              <p onClick={() => setSettingsPage('general')}>General</p>
              <p onClick={() => setSettingsPage('account')}>Account</p>
            </div>
          </div>
          <div className='rightMenu'>{renderContent()}</div>
        </div>
      </div>
    </>
  );
}

function General() {
  const { user } = useUser();
  const [selected, setSelected] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [privateAccount, setPrivateAccount] = useState<boolean>(false);

  // Load current settings
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        const uni = data?.university;
        if (uni?.value) setSelected(uni.value as string);
        setPrivateAccount(data?.private ?? false); // Load privacy setting
      } catch {}
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return setMessage('You must be logged in.');
    if (!selected) return setMessage('Please select a university.');

    const sel: UniversityOption | undefined = UNIVERSITY_OPTIONS.find((u) => u.value === selected);
    if (!sel) return setMessage('Invalid selection.');

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
    } catch (e: any) {
      setMessage(`❌ ${e?.message || 'Failed to update'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className='general-settings'>
      <h2>General Settings</h2>

      <div className='form-group'>
        <label>University</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value=''>-- Select your university --</option>
          {UNIVERSITY_OPTIONS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div className='form-group' style={{ marginTop: '1rem' }}>
        <label>
          <input
            type='checkbox'
            checked={privateAccount}
            onChange={(e) => setPrivateAccount(e.target.checked)}
          />
          Make my account private (hide from friend search)
        </label>
      </div>

      <button onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>

      {message && <p style={{ marginTop: 12 }}>{message}</p>}
    </div>
  );
}

function Account() {
  const { user } = useUser();
  const [username, setUsername] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  // Username change handler
  const handleUsernameChange = async () => {
    if (!user) return setMessage('You must be logged in.');
    try {
      await updateProfile(user, { displayName: username });

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { username });

      setMessage('✅ Username updated successfully!');
    } catch (error: any) {
      setMessage(`❌ Error updating username: ${error.message}`);
    }
  };

  // Password change handler
  const handlePasswordChange = async () => {
    if (!user) return setMessage('You must be logged in.');
    if (!currentPassword || !newPassword) return setMessage('Please fill both fields.');
    if (!user.email) return setMessage('No email on this account. Please re-login and try again.');

    try {
      // Reauthenticate
      const cred = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, cred);

      // Update password
      await updatePassword(user, newPassword);
      setMessage('✅ Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setMessage('⚠️ Please log in again before changing your password.');
      } else {
        setMessage(`❌ ${error.message}`);
      }
    }
  };

  return (
    <div className='account-settings'>
      <h2>Account Settings</h2>

      <div className='form-group'>
        <label>Username</label>
        <input
          type='text'
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder='Enter new username'
        />
        <button onClick={handleUsernameChange}>Save Username</button>
      </div>

      <div className='form-group'>
        <label>Current Password</label>
        <input
          type='password'
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder='Enter current password'
        />
      </div>

      <div className='form-group'>
        <label>New Password</label>
        <input
          type='password'
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder='Enter new password'
        />
        <button onClick={handlePasswordChange}>Update Password</button>
      </div>

      {message && <p style={{ marginTop: '1rem', color: '#ccc' }}>{message}</p>}
    </div>
  );
}
