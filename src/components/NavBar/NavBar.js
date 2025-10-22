import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { CurrencyProvider } from '@components/CurrencySwitcher/currencyswitcher';
import { auth } from '@myfirebase/firebaseConfig';
import { useUser } from '@backend/firebase/UserFunctions';
import './NavBar.css';
import tiltLogo from '@/assets/Tilt.png';
import userIcon from '@/assets/user-icon.png';
import caretIcon from '@/assets/caret-icon.png';
import NavWindow from '@components/NavWindow/NavWindow';
import RegisterUser from '@components/Auth/RegisterUser';
import SignInPopup from '@components/Auth/SignInUser';
import UserBalance from '@components/UserBalance/UserBalance';
export default function NavBar() {
    const navigate = useNavigate();
    const [NavActive, SetNavActive] = useState(false);
    // State for showing login popup (Boolean)
    const [LoginActive, SetLogin] = useState(false);
    // State for showing register popup (Boolean)
    const [SignUpActive, SetSignUp] = useState(false);
    // // Firebase auth state, (null if logged out, User firebase Auth object if logged in)
    // const [user, setUser] = useState<User | null>(null);
    // // Balance state
    // const [balance, setBalance] = useState<number | null>(null);
    const { user, balance, userProfile } = useUser();
    // useEffect(() => {
    //   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    //     // Whenever user logs in or out, update user state to current user
    //     setUser(currentUser);
    //   });
    //   // Remove listener when NavBar unmounts
    //   return () => unsubscribe();
    // }, []);
    function HandleLoginClick() {
        if (SignUpActive) {
            SetSignUp(false);
        }
        SetLogin((prev) => !prev);
    }
    function HandleRegisterClick() {
        if (LoginActive) {
            SetLogin(false);
        }
        SetSignUp((prev) => !prev);
    }
    // Sets null balance if user not signed in
    // useEffect(() => {
    //   if (!user) {
    //     setBalance(null);
    //     return;
    //   }
    //   const data = doc(db, 'users', user.uid);
    //   // Updates with user balance with the database value
    //   const unsubscribeDoc = onSnapshot(data, (user) => {
    //     if (user.exists()) {
    //       setBalance(user.data().balance ?? 0);
    //     }
    //   });
    //   // Cleanup the Firestore listener when the user logs out or switches
    //   return unsubscribeDoc;
    // }, [user]);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: 'floating-admin-controls', children: [userProfile?.roles?.includes('admin') && (_jsx("button", { onClick: () => navigate('/admin'), children: "Admin Dashboard" })), userProfile?.roles?.includes('staff') && (_jsx("button", { onClick: () => navigate('/staff'), children: "Staff Dashboard" }))] }), _jsxs(CurrencyProvider, { base: 'NZD', DefaultCurrency: 'NZD', children: [_jsxs("div", { className: 'NavBarContainer', children: [_jsx("div", { className: 'Logo', onClick: () => navigate('/'), children: _jsx("img", { src: tiltLogo, width: 80, alt: 'Tilt logo' }) }), _jsx("div", { className: 'UserBalance', children: _jsx("div", { className: 'UserBalanceContainer', children: user ? (_jsxs(_Fragment, { children: [_jsx("div", { className: 'UserIcon', children: _jsx("img", { src: userIcon, width: 25, alt: 'User' }) }), _jsx(UserBalance, { balance: balance }), _jsxs("div", { className: 'DropArrow', onMouseEnter: () => SetNavActive(true), onMouseLeave: () => SetNavActive(false), children: [_jsx("img", { src: caretIcon, width: 25, alt: 'Open' }), NavActive && _jsx(NavWindow, {})] })] })) : (_jsx("div", { className: 'UserIcon', children: _jsx("img", { src: userIcon, width: 25, alt: 'User' }) })) }) }), _jsx("div", { className: 'LoginControls', children: user ? (_jsxs("div", { className: 'LoggedInBox', style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("span", { children: user.displayName || user.email || 'Logged in!' }), _jsx("button", { onClick: () => navigate('/settings'), style: {
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #888',
                                                background: '#444',
                                                color: '#fff',
                                                cursor: 'pointer',
                                            }, children: "Settings" }), _jsx("button", { onClick: () => signOut(auth), style: {
                                                padding: '4px 10px',
                                                borderRadius: 6,
                                                border: '1px solid #888',
                                                background: '#222',
                                                color: '#fff',
                                                cursor: 'pointer',
                                            }, children: "Logout" })] })) : (
                                // If no user logged in, show login/register buttons
                                _jsxs(_Fragment, { children: [_jsx("button", { onClick: HandleLoginClick, disabled: SignUpActive, children: "Login" }), _jsx("button", { onClick: HandleRegisterClick, disabled: LoginActive, children: "Register" })] })) })] }), _jsx(RegisterUser, { open: SignUpActive, onClose: () => SetSignUp(false) }), _jsx(SignInPopup, { open: LoginActive, onClose: () => SetLogin(false) })] })] }));
}
