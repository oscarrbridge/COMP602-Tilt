import './Footer.css'
import { useNavigate } from 'react-router-dom';

export default function Footer()
{

    const navigate = useNavigate();

    return(
        <>
        
            <div className='FooterContainer'>
                <div className='FooterColumn col1'>
                    <img src='src/assets/Tilt.png' width={160} />
                </div>
                <div className='FooterColumn col1'>
                    <h2>Links</h2>
                    <ul>
                        <li><p onClick={() => navigate('/')}>Home</p></li>
                        <li><p onClick={() => navigate('/wallet')}>Wallet</p></li>
                        <li><p onClick={() => navigate('/leaderboard')}>Leaderboard</p></li>
                        <li><p onClick={() => navigate('/statistics')}>Statistics</p></li>
                        <li><p onClick={() => navigate('/friends')}>Friends</p></li>
                    </ul>
                </div>
                <div className='FooterColumn col1'>
                    <h2>Info</h2>
                </div>
            </div>
        
        </>
    )
}