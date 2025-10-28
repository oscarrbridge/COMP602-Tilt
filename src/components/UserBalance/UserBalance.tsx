import './UserBalance.css';
import { Price } from '../CurrencySwitcher/currencyswitcher';

export default function UserBalance({ balance }: { balance: number | null }) {
  // Convert NZD cents -> NZD dollars
  const balanceNZDMajor = balance !== null ? balance / 100 : null;

  return (
    <div className='UserBalance'>
      <p>{balanceNZDMajor !== null ? <Price amount={balanceNZDMajor} from='NZD' /> : '---'}</p>
    </div>
  );
}
