import { db } from './firebaseConfig';
import { 
  doc, 
  collection, 
  runTransaction, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  writeBatch,
  increment
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export interface EventBet {
  id?: string;
  eventId: string;
  userId: string;
  amount: number;
  prediction: 'yes' | 'no'; // yes = event will happen, no = event won't happen
  placedAt: any;
  status: 'pending' | 'won' | 'lost';
  payout?: number;
}

/**
 * Place a bet on a special event
 */
export async function placeEventBet(
  eventId: string, 
  amount: number, 
  prediction: 'yes' | 'no'
): Promise<void> {
  const uid = getAuth().currentUser?.uid;
  if (!uid) throw new Error("Must be signed in to place bet");
  
  if (amount <= 0) throw new Error("Bet amount must be positive");

  const userDoc = doc(db, 'users', uid);
  const betsCollection = collection(db, 'eventBets');
  
  await runTransaction(db, async (transaction) => {
    // Check user's current balance
    const userSnapshot = await transaction.get(userDoc);
    if (!userSnapshot.exists()) {
      throw new Error("User profile not found");
    }
    
    const userData = userSnapshot.data();
    const currentBalance = userData.balance || 0;
    
    if (currentBalance < amount) {
      throw new Error("Insufficient balance");
    }
    
    // Check if user already has a bet on this event
    const existingBetQuery = query(
      betsCollection, 
      where("eventId", "==", eventId), 
      where("userId", "==", uid)
    );
    const existingBets = await getDocs(existingBetQuery);
    
    if (!existingBets.empty) {
      throw new Error("You already have a bet on this event");
    }
    
    // Deduct bet amount from user balance
    transaction.update(userDoc, {
      balance: currentBalance - amount,
      lastUpdated: serverTimestamp()
    });
    
    // Record the transaction
    const transactionCollection = collection(userDoc, 'transactions');
    const transactionDoc = doc(transactionCollection);
    transaction.set(transactionDoc, {
      amount: -amount,
      type: 'bet',
      balanceType: 'balance',
      gameType: 'event-betting',
      eventId: eventId,
      prediction: prediction,
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount,
      timestamp: serverTimestamp(),
    });
    
    // Create the bet record
    const betDoc = doc(betsCollection);
    transaction.set(betDoc, {
      eventId,
      userId: uid,
      amount,
      prediction,
      placedAt: serverTimestamp(),
      status: 'pending'
    } as EventBet);
  });
}

/**
 * Get all bets for a specific event
 */
export async function getEventBets(eventId: string): Promise<EventBet[]> {
  const betsCollection = collection(db, 'eventBets');
  const q = query(betsCollection, where("eventId", "==", eventId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EventBet[];
}

/**
 * Get all bets for a specific user
 */
export async function getUserEventBets(userId: string): Promise<EventBet[]> {
  const betsCollection = collection(db, 'eventBets');
  const q = query(betsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EventBet[];
}

/**
 * Calculate and distribute payouts for an event when it's resolved
 */
export async function resolveEventBets(eventId: string, outcome: 'happened' | 'did-not-happen'): Promise<void> {
  const betsCollection = collection(db, 'eventBets');
  const betsQuery = query(betsCollection, where("eventId", "==", eventId), where("status", "==", "pending"));
  const betsSnapshot = await getDocs(betsQuery);
  
  if (betsSnapshot.empty) {
    console.log("No pending bets found for event:", eventId);
    return;
  }
  
  const allBets = betsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as EventBet[];
  
  // Separate winning and losing bets
  const winningPrediction = outcome === 'happened' ? 'yes' : 'no';
  const winningBets = allBets.filter(bet => bet.prediction === winningPrediction);
  const losingBets = allBets.filter(bet => bet.prediction !== winningPrediction);
  
  // Calculate total betting pool for logging
  const totalPool = allBets.reduce((sum, bet) => sum + bet.amount, 0);
  
  // If no winning bets, no payouts needed
  if (winningBets.length === 0) {
    console.log("No winning bets for event:", eventId);
    // Just mark all bets as lost
    const batch = writeBatch(db);
    allBets.forEach(bet => {
      const betDoc = doc(db, 'eventBets', bet.id!);
      batch.update(betDoc, { 
        status: 'lost',
        payout: 0
      });
    });
    await batch.commit();
    return;
  }
  
  // Simple 2x payout for winning bets
  const payoutMultiplier = 2;
  
  // Process all bet updates and user payouts in batches
  const batch = writeBatch(db);
  
  // Update winning bets and pay out users
  for (const bet of winningBets) {
    const payout = bet.amount * payoutMultiplier;
    const userDoc = doc(db, 'users', bet.userId);
    const betDoc = doc(db, 'eventBets', bet.id!);
    
    // Update bet status and payout
    batch.update(betDoc, { 
      status: 'won',
      payout: payout
    });
    
    // Add payout to user balance (using increment for safety)
    batch.update(userDoc, {
      balance: increment(payout),
      lastUpdated: serverTimestamp()
    });
    
    // Record win transaction
    const transactionCollection = collection(userDoc, 'transactions');
    const transactionDoc = doc(transactionCollection);
    batch.set(transactionDoc, {
      amount: payout,
      type: 'win',
      balanceType: 'balance',
      gameType: 'event-betting',
      eventId: eventId,
      prediction: bet.prediction,
      timestamp: serverTimestamp(),
    });
  }
  
  // Update losing bets
  for (const bet of losingBets) {
    const betDoc = doc(db, 'eventBets', bet.id!);
    batch.update(betDoc, { 
      status: 'lost',
      payout: 0
    });
    
    // Record loss transaction
    const userDoc = doc(db, 'users', bet.userId);
    const transactionCollection = collection(userDoc, 'transactions');
    const transactionDoc = doc(transactionCollection);
    batch.set(transactionDoc, {
      amount: 0,
      type: 'loss',
      balanceType: 'balance',
      gameType: 'event-betting',
      eventId: eventId,
      prediction: bet.prediction,
      timestamp: serverTimestamp(),
    });
  }
  
  await batch.commit();
  
  console.log(`Event ${eventId} resolved: ${winningBets.length} winners, ${losingBets.length} losers`);
  console.log(`Total pool: ${totalPool}, Payout: ${payoutMultiplier}x (winners get ${payoutMultiplier}x their bet)`);
}