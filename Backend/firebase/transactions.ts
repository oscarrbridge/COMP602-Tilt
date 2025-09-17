import { db } from './firebaseConfig';
import { doc, collection, runTransaction, serverTimestamp, increment } from 'firebase/firestore';

export type transactionType = 'bet' | 'win' | 'loss' | 'deposit' | 'withdraw';

export async function userTransaction(
  uid: string,
  amount: number,
  type: transactionType,
  optional?: { gameId?: string; gameType?: string; round?: number }
) {
  const userDoc = doc(db, 'users', uid);
  const transactionCollection = collection(userDoc, 'transactions');

  await runTransaction(db, async (transaction) => {
    const user = await transaction.get(userDoc);

    // Fallback to 0 if balance is undefined
    const before = user.exists() ? (user.data()?.balance ?? 0) : 0;
    // Balance after transaction
    const after = before + amount;

    // Only count wins/losses (not deposit/withdraw)
    const affectsStats = type === 'bet' || type === 'win' || type === 'loss';
    // Determines if the transaction is a win or loss
    const win = affectsStats && amount > 0 ? amount : 0;
    const loss = affectsStats && amount < 0 ? Math.abs(amount) : 0;

    // Initilise transaction collection on first write ie: a user's first transaction
    if (!user.exists()) {
      transaction.set(userDoc, {
        balance: after,
        totalWinnings: win,
        totalLosses: loss,
        netProfit: affectsStats ? amount : 0,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
    } else {
      // Updates balance and history to user documents
      transaction.update(userDoc, {
        balance: after,
        totalWinnings: increment(win),
        totalLosses: increment(loss),
        ...(affectsStats ? { netProfit: increment(amount) } : {}),
        lastUpdated: serverTimestamp(),
      });
    }

    // Updates fields to transaction documents
    const transactionDoc = doc(transactionCollection);
    transaction.set(transactionDoc, {
      amount,
      type,
      gameId: optional?.gameId ?? null,
      gameType: optional?.gameType ?? null,
      round: optional?.round ?? null,
      balanceBefore: before,
      balanceAfter: after,
      timestamp: serverTimestamp(),
    });
  });
}

export const recordBet = (uid: string, amt: number, o?: any) =>
  userTransaction(uid, -Math.abs(amt), 'bet', o); // Deduct on bet
export const recordWin = (uid: string, amt: number, o?: any) =>
  userTransaction(uid, Math.abs(amt), 'win', o);
export const recordLoss = (uid: string, amt: number, o?: any) =>
  userTransaction(uid, 0, 'loss', o); // Changed to not deduct when loss just record they lost.
export const deposit = (uid: string, amt: number) => userTransaction(uid, Math.abs(amt), 'deposit');
export const withdraw = (uid: string, amt: number) =>
  userTransaction(uid, -Math.abs(amt), 'withdraw');
