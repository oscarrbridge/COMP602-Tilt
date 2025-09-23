import { recordBet, recordWin, recordLoss } from '@myfirebase/transactions';

export async function placeBet(uid: string, amount: number, round: number, game: string) {
  return recordBet(uid, amount, { gameType: game, round });
}

export async function recordWinTx(uid: string, amount: number, round: number, game: string) {
  return recordWin(uid, amount, { gameType: game, round });
}

export async function recordLossTx(uid: string, amount: number, round: number, game: string) {
  return recordLoss(uid, amount, { gameType: game, round });
}