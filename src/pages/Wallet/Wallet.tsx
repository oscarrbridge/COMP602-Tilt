import './Wallet.css';
import NavBar from '../../components/NavBar/NavBar.tsx';
import Withdraw from '../../components/Withdraw/Withdraw.tsx';
import Deposit from '../../components/Deposit/Deposit.tsx';
import UniCodes from '../../components/AddUniBalance/AddUniBalance.tsx';
import AutoPayment from '../../components/AutoPayment/AutoPayment.tsx';
import { useUser } from '../../../Backend/firebase/UserFunctions.tsx';
import Footer from '@components/Footer/footer';

export default function Wallet() {
  useUser();

  return (
    <>
      <NavBar />

      <main className='WalletContainer'>
        <header className='WalletHeader'>
          <h1>Wallet</h1>
          <p>Manage deposits, withdrawals, auto top-ups, and uni codes.</p>
        </header>

        <section className='WalletGrid'>
          <article className='Card'>
            <h2 className='CardTitle'>
              <span className='AccentDot' /> Deposit Funds
            </h2>
            <Deposit />
          </article>

          <article className='Card'>
            <h2 className='CardTitle'>
              <span className='AccentDot' /> Withdraw Funds
            </h2>
            <Withdraw />
          </article>

          <article className='Card Card--autopay AutoTopupCard'>
            <h2 className='CardTitle'>
              <span className='AccentDot' /> Automatic Top-up
            </h2>
            <AutoPayment />
          </article>

          <article className='Card'>
            <h2 className='CardTitle'>
              <span className='AccentDot' /> Redeem a Uni Code
            </h2>
            <UniCodes />
          </article>
        </section>
      </main>

      <Footer />
    </>
  );
}
