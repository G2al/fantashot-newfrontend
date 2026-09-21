import type { Money } from "@/types/tournament";

/**
 * Movimento del wallet. Contratto PROPOSTO al backend (GET /me/transactions):
 * l'endpoint non esiste ancora, vedi la richiesta inviata al team backend.
 * `amount` e' sempre positivo, il segno lo dice `direction`.
 */
export type WalletTransaction = {
  id: number;
  direction: "in" | "out";
  /** deposit | enrollment | prize | refund | withdrawal | adjustment (altri valori mostrati cosi' come sono). */
  reason: string;
  description?: string | null;
  amount: Money;
  balance_after?: Money | null;
  tournament?: { id: number; title: string } | null;
  created_at: string;
};

export type WalletTransactionsResponse = {
  data: WalletTransaction[];
  meta: { current_page: number; last_page: number; total: number };
  /** Totali dell'INSIEME filtrato (non solo della pagina), calcolati dal backend. */
  summary?: { total_in: Money; total_out: Money } | null;
};

export type WalletTransactionFilters = {
  type: "all" | "in" | "out";
  reason: string;
  from: string;
  to: string;
};
