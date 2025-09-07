import { useEffect, useState } from 'react';
import './LocalLeaderboard.css'

export default function LocalLeaderboard()
{
    interface Users{
        UserID: number;
        Name: string;
        BalanceTotal: number;
    }

    const [Users, SetUsers] = useState<Users[]>([])


    function GetUserData()
    {
        // Do a fetch
        SetUsers([
            {
                'UserID': 1,
                'Name': '1',
                'BalanceTotal': 1
            },
            {
                'UserID': 2,
                'Name': '2',
                'BalanceTotal': 2
            },
            {
                'UserID': 3,
                'Name': '3',
                'BalanceTotal': 3
            },
            {
                'UserID': 4,
                'Name': '4',
                'BalanceTotal': 4
            },
        ])
    }

    useEffect(() => {
        GetUserData();
    }, [])


    return(
        <>
        <div className='LocalLeaderboard'>
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Balance Won</th>
                    </tr>
                </thead>
                <tbody>
                    {Users.map((i) => (
                            <tr key={i.UserID}>
                                <td>{i.Name}</td>
                                <td>{i.BalanceTotal}</td>
                            </tr>
                    ))}
                </tbody>
            </table>
        </div>
        </>
    );
}