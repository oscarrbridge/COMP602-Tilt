import './Wallet.css'
import NavBar from '../../components/NavBar/NavBar.tsx'
import Withdraw from '../../components/Withdraw/Withdraw.tsx'
import Deposit from '../../components/Deposit/Deposit.tsx';
import UniCodes from '../../components/AddUniBalance/AddUniBalance.tsx'

export default function Wallet()
{
    return(
        <>
            <NavBar />

            <div className='WalletContainer'>
                <div className='TopRow'>
                    <div className='DepositContainer'>
                        <h2>Deposit Funds</h2>
                        <Deposit />
                    </div>

                    <div className='WithdrawContainer'>
                        <h2>Withdraw Funds</h2>
                        <Withdraw />
                    </div>
                </div>

                <div className='BottomRow'>
                    <div className='UniCodeContainer'>
                        <h2>Redeem a Uni Code</h2>
                        <UniCodes />
                    </div>
                </div>
            </div>
            
        </>
    );
} 