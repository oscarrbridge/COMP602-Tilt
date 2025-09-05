import './NavWindow.css'
import { useNavigate } from "react-router-dom"

export default function NavWindow() {
    const navigate = useNavigate();
    
    return(
        <>
            <div className='NavWindowContainer'>
                <div onClick={() => navigate('/')}><p className='NavItem'>Home</p></div>
                <div onClick={() => navigate('/deposit')}><p className='NavItem'>Deposit</p></div>
                <div onClick={() => navigate('/withdraw')}><p className='NavItem'>Withdraw</p></div>
                <div onClick={() => navigate('/')}><p className='NavItem'>Currency</p></div>
                <div onClick={() => navigate('/statistics')}><p className='NavItem'>Statistics</p></div>
            </div>
        </>
    );
}