import './Wallet.css'
import NavBar from '../../components/NavBar/NavBar.tsx'
import Withdraw from '../../components/Withdraw/Withdraw.tsx'
import Deposit from '../../components/Deposit/Deposit.tsx';

export default function Wallet()
{
    return(
        <>
            <NavBar />

            <div className='WalletContainer'>
                <div className='DepositContainer'>
                    <h2>Deposit Funds</h2>
                    <Deposit />
                </div>

                <div className='WithdrawContainer'>
                    <h2>Withdraw Funds</h2>
                    <Withdraw />
                </div>
            </div>
            
        </>
    );
} 