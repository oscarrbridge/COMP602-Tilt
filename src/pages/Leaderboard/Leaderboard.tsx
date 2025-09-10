import './Leaderboard.css'
import NavBar from '../../components/NavBar/NavBar.tsx'

import LocalLeaderboard from '../../components/LocalLeaderboard/LocalLeaderboard.tsx'
import GlobalLeaderboard from '../../components/GlobalLeaderboard/GlobalLeaderboard.tsx'

export default function Leaderboard()
{
    return(
        <>
            <NavBar />
            
            <div className='StatisticsContainer'>
                <div className='StatisticsComponent'><h2>Local Leaderboard</h2><LocalLeaderboard /></div>
                <div className='StatisticsComponent'><h2>Global Leaderboard</h2><GlobalLeaderboard /></div>
            </div>
        </>
    );
} 