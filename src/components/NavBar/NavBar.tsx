import { Login } from '@mui/icons-material';
import './NavBar.css'
import { useState } from 'react'

import UserBalance from '../UserBalance/UserBalance.tsx';

import LoginWindow from '../LoginWindow/LoginWindow.tsx'
import RegisterWindow from '../RegisterWindow/RegisterWindow.tsx'

export default function NavBar()
{
    const [LoginActive, SetLogin] = useState(false);
    const [SignUpActive, SetSignUp] = useState(false);

    function HandleLoginClick()
    {
        if(SignUpActive)
        {
            SetSignUp(false);
        }
        
        SetLogin(prev => !prev);
    }

    function HandleRegisterClick()
    {
        if(LoginActive)
        {
            SetLogin(false);
        }
        
        SetSignUp(prev => !prev);
    }

    return (
        <>
            <div className="NavBarContainer">
                <div className='Logo'>Logo</div>
                
                <div className='UserBalance'><UserBalance /></div>
                
                <div className='LoginControls'>
                    <button onClick={HandleLoginClick}>Login</button>
                    <button onClick={HandleRegisterClick}>Register</button>
                </div>
            </div>
            <div className='LoginMiniWindow'>
                {LoginActive && <LoginWindow />}
                {SignUpActive && <RegisterWindow />}
            </div>
        </>
    )
}