// pokerHandEvaluator.ts
export type Card = { rank: string; suit: string };

const rankValues: Record<string, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

// Helper: sort cards descending by rank
const sortCards = (cards: Card[]) => cards.sort((a, b) => rankValues[b.rank] - rankValues[a.rank]);

// Count occurrences of each rank
const countRanks = (cards: Card[]) => {
  const counts: Record<number, number> = {};
  cards.forEach((c) => {
    const v = rankValues[c.rank];
    counts[v] = (counts[v] || 0) + 1;
  });
  return counts;
};

// Count occurrences of each suit
const countSuits = (cards: Card[]) => {
  const counts: Record<string, Card[]> = {};
  cards.forEach((c) => {
    if (!counts[c.suit]) counts[c.suit] = [];
    counts[c.suit].push(c);
  });
  return counts;
};

// Check for straight (returns highest card of straight or null)
const getStraightHigh = (cards: Card[]) => {
  const values = Array.from(new Set(cards.map((c) => rankValues[c.rank]))).sort((a, b) => b - a);
  for (let i = 0; i <= values.length - 5; i++) {
    if (values[i] - values[i + 4] === 4) return values[i];
  }
  // Special case: A-2-3-4-5
  if (
    values.includes(14) &&
    values.includes(5) &&
    values.includes(4) &&
    values.includes(3) &&
    values.includes(2)
  )
    return 5;
  return null;
};

// Evaluate hand strength (higher = better)
export function evaluateHand(cards: Card[]): number {
  cards = sortCards(cards);
  const rankCount = countRanks(cards);
  const suitCount = countSuits(cards);

  let flushCards: Card[] | null = null;
  for (const suit in suitCount) {
    if (suitCount[suit].length >= 5) {
      flushCards = sortCards(suitCount[suit]);
      break;
    }
  }

  const straightHigh = getStraightHigh(cards);
  const straightFlushHigh = flushCards ? getStraightHigh(flushCards) : null;

  // Royal Flush
  if (straightFlushHigh === 14) return 9000000;
  // Straight Flush
  if (straightFlushHigh) return 8000000 + straightFlushHigh * 10;

  // Four of a Kind
  const quads = Object.keys(rankCount).find((k) => rankCount[+k] === 4);
  if (quads) return 7000000 + +quads * 10;
  // Full House
  const trips = Object.keys(rankCount)
    .filter((k) => rankCount[+k] === 3)
    .map((k) => +k)
    .sort((a, b) => b - a);
  const pairs = Object.keys(rankCount)
    .filter((k) => rankCount[+k] === 2)
    .map((k) => +k)
    .sort((a, b) => b - a);
  if (trips.length >= 1 && (pairs.length >= 1 || trips.length >= 2))
    return 6000000 + trips[0] * 100 + (pairs[0] || trips[1]) * 10;
  // Flush
  if (flushCards) return 5000000 + rankValues[flushCards[0].rank];
  // approximate high card of flush
  // Straight
  if (straightHigh) return 4000000 + straightHigh * 10;
  // Three of a Kind
  if (trips.length >= 1) return 3000000 + trips[0] * 10;
  // Two Pair
  if (pairs.length >= 2) return 2000000 + pairs[0] * 100 + pairs[1] * 10;
  // One Pair
  if (pairs.length >= 1) return 1000000 + pairs[0] * 10;
  // High Card
  return Math.max(...cards.map((c) => rankValues[c.rank]));
}
