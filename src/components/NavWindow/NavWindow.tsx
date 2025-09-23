import './NavWindow.css';
import { CurrencySwitcher } from '../../components/CurrencySwitcher/currencyswitcher'; // 
import { useNavigate } from "react-router-dom"

export default function NavWindow() {
    const navigate = useNavigate();
     
    return(
        <>
            <div className='NavWindowContainer'>
                {}
                <div onClick={() => navigate('/')}><p className='NavItem'>Home</p></div>
                <div onClick={() => navigate('/wallet')}><p className='NavItem'>Wallet</p></div>
                <div onClick={() => navigate('/leaderboard')}><p className='NavItem'>Leaderboard</p></div>
                <div onClick={() => navigate('/statistics')}><p className='NavItem'>Statistics</p></div>
                <br></br>

                <div className="CurrencySection">
                    <CurrencySwitcher 
                        list={['NZD', 'AUD', 'USD', 'EUR', 'GBP']} 
                    />
                </div>

                {}
            
            </div>
        </>
    );
}