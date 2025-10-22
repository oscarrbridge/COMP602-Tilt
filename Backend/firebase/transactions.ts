import { db } from './firebaseConfig';
import { doc, collection, runTransaction, serverTimestamp, increment } from 'firebase/firestore';

export type transactionType = 'bet' | 'win' | 'loss' | 'deposit' | 'withdraw';
export type balanceType = 'balance' | 'unibalance';

export async function userTransaction(
  uid: string,
  amount: number,
  type: transactionType,
  balanceType: balanceType = 'balance',
  optional?: { gameId?: string; gameType?: string; round?: number }
) {
  const userDoc = doc(db, 'users', uid);
  const transactionCollection = collection(userDoc, 'transactions');

  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(userDoc);

    // Fallback to 0 if balance is undefined
    const before = user.exists() ? (user.data()?.[balanceType] ?? 0) : 0;
    // Balance after transaction
    const after = before + amount;

    // Only count wins/losses (not deposit/withdraw)
    const affectsStats = type === 'bet' || type === 'win' || type === 'loss';
    // Determines if the transaction is a win or loss
    const win = affectsStats && amount > 0 ? amount : 0;
    const loss = affectsStats && amount < 0 ? Math.abs(amount) : 0;

    // Determine field names based on balance type
    const totalWinningsField = balanceType === 'unibalance' ? 'uniTotalWinnings' : 'totalWinnings';
    const totalLossesField = balanceType === 'unibalance' ? 'uniTotalLosses' : 'totalLosses';
    const netProfitField = balanceType === 'unibalance' ? 'uniNetProfit' : 'netProfit';

    // Initilise transaction collection on first write ie: a user's first transaction
    if (!user.exists()) {
      transaction.set(userDoc, {
        balance: balanceType === 'balance' ? after : 0,
        unibalance: balanceType === 'unibalance' ? after : 0,
        totalWinnings: balanceType === 'balance' ? win : 0,
        totalLosses: balanceType === 'balance' ? loss : 0,
        netProfit: balanceType === 'balance' && affectsStats ? amount : 0,
        uniTotalWinnings: balanceType === 'unibalance' ? win : 0,
        uniTotalLosses: balanceType === 'unibalance' ? loss : 0,
        uniNetProfit: balanceType === 'unibalance' && affectsStats ? amount : 0,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
    } else {
      // Updates balance and history to user documents
      const updateData: any = {
        [balanceType]: after,
        [totalWinningsField]: increment(win),
        [totalLossesField]: increment(loss),
        lastUpdated: serverTimestamp(),
      };

      if (affectsStats) {
        updateData[netProfitField] = increment(amount);
      }

      transaction.update(userDoc, updateData);
    }

    // Updates fields to transaction documents
    const transactionDoc = doc(transactionCollection);
    transaction.set(transactionDoc, {
      amount,
      type,
      balanceType,
      gameId: optional?.gameId ?? null,
      gameType: optional?.gameType ?? null,
      round: optional?.round ?? null,
      balanceBefore: before,
      balanceAfter: after,
      timestamp: serverTimestamp(),
    });
  });
}

// Regular balance functions
export const recordBet = (uid: string, amt: number, o?: any) =>
  userTransaction(uid, -Math.abs(amt), 'bet', 'balance', o); // Deduct on bet
export const recordWin = (uid: string, amt: number, o?: any) =>
  userTransaction(uid, Math.abs(amt), 'win', 'balance', o);
export const recordLoss = (uid: string, _amt: number, o?: any) =>
  userTransaction(uid, 0, 'loss', 'balance', o); // Changed to not deduct when loss just record they lost.
export const deposit = (uid: string, amt: number) =>
  userTransaction(uid, Math.abs(amt), 'deposit', 'balance');
export const withdraw = (uid: string, amt: number) =>
  userTransaction(uid, -Math.abs(amt), 'withdraw', 'balance');

// Unibalance functions
export const uniDeposit = (uid: string, amt: number) =>
  userTransaction(uid, Math.abs(amt), 'deposit', 'unibalance');
export const uniWithdraw = (uid: string, amt: number) =>
  userTransaction(uid, -Math.abs(amt), 'withdraw', 'unibalance');
