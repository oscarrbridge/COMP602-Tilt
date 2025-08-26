import { useState } from 'react';
import './UserBalance.css'

import NavWindow from '../NavWindow/NavWindow';

export default function UserBalance() {
    const [NavActive, SetNavActive] = useState(false);

    return (
        <>
            <div className="UserBalanceConatiner">
                <div className="UserIcon"><img src="src\assets\user-icon.png" width={25} /></div>
                <div className="UserBalance"><p>999,999</p></div>
                <div className="DropArrow" 
                    onMouseEnter={() => SetNavActive(true)}
                    onMouseLeave={() => SetNavActive(false)}>
                    <img src="src\assets\caret-icon.png" width={25} />
                    {NavActive && <NavWindow />}
                </div>
            </div>
        </>
    );
}