import type { Wallet } from "@/types/auth";

/** Somma dei wallet in unita' minori (centesimi), la stessa scala di Money.amount. null = saldo non noto. */
export function getWalletBalanceMinor(wallets?: Wallet[]): number | null {
  if (!wallets?.length) return null;

  return wallets.reduce((sum, wallet) => sum + Number(wallet.balance.amount), 0);
}
