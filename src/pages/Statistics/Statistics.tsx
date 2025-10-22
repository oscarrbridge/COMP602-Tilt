import './Statistics.css';
import NavBar from '@components/NavBar/NavBar';
import History from '@components/TransactionHistory/TransactionHistory';
import UserStatistics from '@components/UserStatistics/UserStatistics';
import Footer from '@components/Footer/Footer';

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

      <Footer />
    </>
  );
}
