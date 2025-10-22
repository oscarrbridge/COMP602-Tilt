import { recordBet, recordWin, recordLoss, uniDeposit, uniWithdraw } from './firebase/transactions';
export async function placeBet(uid, amount, round, game) {
    return recordBet(uid, amount, { gameType: game, round });
}
export async function recordWinTx(uid, amount, round, game) {
    return recordWin(uid, amount, { gameType: game, round });
}
export async function recordLossTx(uid, amount, round, game) {
    return recordLoss(uid, amount, { gameType: game, round });
}
export async function addUniBalance(uid, amount) {
    return uniDeposit(uid, amount);
}
export async function subtractUniBalance(uid, amount) {
    return uniWithdraw(uid, amount);
}
