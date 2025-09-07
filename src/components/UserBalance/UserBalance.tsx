import './UserBalance.css';

export default function UserBalance({ balance }: { balance: number | null }) {
  return (
    <div className='UserBalance'>
      <p>{balance !== null ? balance.toLocaleString() : '---'}</p>
    </div>
  );
}
