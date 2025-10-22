import './Wallet.css';
import NavBar from '@components/NavBar/NavBar';
import Withdraw from '@components/Withdraw/Withdraw';
import Deposit from '@components/Deposit/Deposit';
import UniCodes from '@components/AddUniBalance/AddUniBalance';
import AutoPayment from '@components/AutoPayment/AutoPayment';
import { useUser } from '@backend/firebase/UserFunctions';
import Footer from '@components/Footer/Footer';

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
