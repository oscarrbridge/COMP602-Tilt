import './UserBalance.css';
import { Price } from '../CurrencySwitcher/currencyswitcher';

export default function UserBalance({ balance }: { balance: number | null }) {
  return (
    <div className="UserBalance">
      <p>{balance !== null ? <Price amount={balance} from="NZD" /> : '---'}</p>
    </div>
  );
}