import { useState } from 'react';
import type { User } from 'firebase/auth';
import { recordBet, recordWin, recordLoss } from '@myfirebase/transactions';
import { addUniBalance, subtractUniBalance } from '../../../Backend/transactions';

type Props = { user: User | null };

export default function TestTransactions({ user }: Props) {
  const [pending, setPending] = useState<null | 'bet' | 'win' | 'loss' | 'addUni' | 'subtractUni'>(null);

  async function testBet() {
    if (!user) return console.error('Not logged in');
    try {
      setPending('bet');
      console.log('Placing bet...');
      // Pass POSITIVE 20; helper will store as -20 internally
      await recordBet(user.uid, 20, { gameType: 'blackjack', round: 1 });
      console.log('Bet recorded');
    } catch (err) {
      console.error('Failed to record bet:', err);
    } finally {
      setPending(null);
    }
  }

  async function testWin() {
    if (!user) return console.error('Not logged in');
    try {
      setPending('win');
      console.log('Recording win...');
      await recordWin(user.uid, 50, { gameType: 'blackjack', round: 1 });
      console.log('Win recorded');
    } catch (err) {
      console.error('Failed to record win:', err);
    } finally {
      setPending(null);
    }
  }

  async function testLoss() {
    if (!user) return console.error('Not logged in');
    try {
      setPending('loss');
      console.log('Recording loss...');
      await recordLoss(user.uid, 15, { gameType: 'blackjack', round: 2 });
      console.log('Loss recorded');
    } catch (err) {
      console.error('Failed to record loss:', err);
    } finally {
      setPending(null);
    }
  }

  async function testAddUniBalance() {
    if (!user) return console.error('Not logged in');
    try {
      setPending('addUni');
      console.log('Adding uni balance...');
      await addUniBalance(user.uid, 100);
      console.log('Uni balance added');
    } catch (err) {
      console.error('Failed to add uni balance:', err);
    } finally {
      setPending(null);
    }
  }

  async function testSubtractUniBalance() {
    if (!user) return console.error('Not logged in');
    try {
      setPending('subtractUni');
      console.log('Subtracting uni balance...');
      await subtractUniBalance(user.uid, 25);
      console.log('Uni balance subtracted');
    } catch (err) {
      console.error('Failed to subtract uni balance:', err);
    } finally {
      setPending(null);
    }
  }

  const disabled = !user || pending !== null;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <button onClick={testBet} disabled={disabled}>
        {pending === 'bet' ? 'Betting…' : 'Test Bet (20)'}
      </button>
      <button onClick={testWin} disabled={disabled}>
        {pending === 'win' ? 'Recording…' : 'Test Win (50)'}
      </button>
      <button onClick={testLoss} disabled={disabled}>
        {pending === 'loss' ? 'Recording…' : 'Test Loss (15)'}
      </button>
      <button onClick={testAddUniBalance} disabled={disabled}>
        {pending === 'addUni' ? 'Adding…' : 'Add Uni Balance (100)'}
      </button>
      <button onClick={testSubtractUniBalance} disabled={disabled}>
        {pending === 'subtractUni' ? 'Subtracting…' : 'Subtract Uni Balance (25)'}
      </button>
    </div>
  );
}
