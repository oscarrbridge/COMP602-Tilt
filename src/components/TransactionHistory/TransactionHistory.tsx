import { useEffect, useState } from 'react';
import './TransactionHistory.css'

export default function()
{
    interface Transaction {
        TransactionID: number;
        TransactionType: string;
        TransactionAmount: number;
        BalanceAfter: number;
    }

    const [Transaction, SetTransaction] = useState<Transaction[]>([])

    async function GetTransactions()
    {
        // do some fetch
        SetTransaction([
            {
                "TransactionID": 1,
                "TransactionType": "Deposit",
                "TransactionAmount": 100000,
                "BalanceAfter": 100000
            },
            {
                "TransactionID": 2,
                "TransactionType": "Withdraw",
                "TransactionAmount": 500,
                "BalanceAfter": 99500
            },
            {
                "TransactionID": 3,
                "TransactionType": "Deposit",
                "TransactionAmount": 131925,
                "BalanceAfter": 231425
            }
        ]) 
    }

    useEffect(() => {
        GetTransactions();
    },[])

    return(
        <>
            <div className='TransactionTable'>
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Balance After</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Transaction.map((i) => (
                                <tr key={i.TransactionID}>
                                    <td>{i.TransactionType}</td>
                                    <td>{i.TransactionAmount}</td>
                                    <td>{i.BalanceAfter}</td>
                                </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}