import { useEffect, useState } from 'react';
import './UserStatistics.css'

export default function UserStatistics()
{
        interface Statistics {
            UserID: number;
            TotalBalance: number;
            TotalDeposited: number;
            TotalWithdrawn: number;
            NetProfit: number;
            GamesPlayed: number;
            BiggestWin: number;
            BiggestLoss: number;
            AverageBet: number;
            BetsEnhanced: number;
            MostProfitableGame: string;
            Level: number;
        }
    
        const [Statistics, SetStatistics] = useState<Statistics[]>([])
    
        async function GetStatistics()
        {
            // do some fetch
            SetStatistics([
                {
                    'UserID': 1,
                    'TotalBalance': 1000,
                    'TotalDeposited': 5,
                    'TotalWithdrawn': 3,
                    'NetProfit': 3000,
                    'GamesPlayed': 544,
                    'BiggestWin': 200,
                    'BiggestLoss': 300,
                    'AverageBet': 20,
                    'BetsEnhanced': 3,
                    'MostProfitableGame': 'Blackjack',
                    'Level': 4,
                    
                }
            ]) 
        }

        useEffect(() => {
            GetStatistics();
        },[])
    
        return(
            <>
                <div className='StatisticsTable'>
                    <table>
                        {Statistics.map((i) => (
                            <tbody key={i.UserID}>
                                    <tr >
                                        <td>Total Balance</td>
                                        <td>{i.TotalBalance}</td>
                                    </tr>
                                    <tr>
                                        <td>Total Deposited</td>
                                        <td>{i.TotalDeposited}</td>
                                    </tr>
                                    <tr>
                                        <td>Total Withdrawn</td>
                                        <td>{i.TotalWithdrawn}</td>
                                    </tr>
                                    <tr>
                                        <td>Net Profit</td>
                                        <td>{i.NetProfit}</td>
                                    </tr>
                                    <tr>
                                        <td>Games Played</td>
                                        <td>{i.GamesPlayed}</td>
                                    </tr>
                                    <tr>
                                        <td>Biggest Win</td>
                                        <td>{i.BiggestWin}</td>
                                    </tr>
                                    <tr>
                                        <td>Biggest Loss</td>
                                        <td>{i.BiggestLoss}</td>
                                    </tr>
                                    <tr>
                                        <td>Average Bet</td>
                                        <td>{i.AverageBet}</td>
                                    </tr>
                                    <tr>
                                        <td>Bets Enhanced</td>
                                        <td>{i.BetsEnhanced}</td>
                                    </tr>
                                    <tr>
                                        <td>Most Profitable Game</td>
                                        <td>{i.MostProfitableGame}</td>
                                    </tr>
                                    <tr>
                                        <td>Level</td>
                                        <td>{i.Level}</td>
                                    </tr>
                            </tbody>
                        ))}
                    </table>
                </div>
            </>
        );
}