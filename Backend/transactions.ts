import { recordBet, recordWin, recordLoss, uniDeposit, uniWithdraw } from './firebase/transactions';

export async function placeBet(uid: string, amount: number, round: number, game: string) {
  return recordBet(uid, amount, { gameType: game, round });
}

export async function recordWinTx(uid: string, amount: number, round: number, game: string) {
  return recordWin(uid, amount, { gameType: game, round });
}

export async function recordLossTx(uid: string, amount: number, round: number, game: string) {
  return recordLoss(uid, amount, { gameType: game, round });
}

export async function addUniBalance(uid: string, amount: number) {
  return uniDeposit(uid, amount);
}

export async function subtractUniBalance(uid: string, amount: number) {
  return uniWithdraw(uid, amount);
}