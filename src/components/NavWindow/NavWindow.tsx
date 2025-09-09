import './NavWindow.css';
import { CurrencySwitcher } from '../../components/CurrencySwitcher/currencyswitcher'; // 

export default function NavWindow() {
    return (
        <>
            <div className='NavWindowConatiner'>
                {}
                <p>Item 1</p>
                <p>Item 2</p>
                <p>Item 3</p>
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