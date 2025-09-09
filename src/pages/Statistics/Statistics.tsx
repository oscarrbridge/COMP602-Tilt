<<<<<<< Updated upstream
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import './Statistics.css'
import NavBar from '../../components/NavBar/NavBar.tsx'

import History from '../../components/TransactionHistory/TransactionHistory.tsx'
import UserStatistics from '../../components/UserStatistics/UserStatistics.tsx'

export default function Statistics()
{
    return(
        <>
            <NavBar />

            
            <div className='StatisticsContainer'>
                <div className='StatisticsComponent'><h2>History</h2><History /></div>
                <div className='StatisticsComponent'><h2>Statistics</h2><UserStatistics /></div>
            </div>

        </>
    );
} 
=======
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
import './Statistics.css';
import NavBar from '../../components/NavBar/NavBar.tsx';

import History from '../../components/TransactionHistory/TransactionHistory.tsx';
import UserStatistics from '../../components/UserStatistics/UserStatistics.tsx';

export default function Statistics() {
  return (
    <>
      <NavBar />
      <div className='StatisticsContainer'>
        <div className='StatisticsComponent'>
          <h2>History</h2>
          <History />
        </div>
        <div className='StatisticsComponent'>
          <h2>Statistics</h2>
          <UserStatistics />
        </div>
      </div>
    </>
  );
}
<<<<<<< Updated upstream
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
