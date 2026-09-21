import { apiFetch } from "@/lib/api";
import type {
  WalletTransactionFilters,
  WalletTransactionsResponse,
} from "@/types/wallet";

const PER_PAGE = 20;

export function getWalletTransactions(
  token: string,
  filters: WalletTransactionFilters,
  page: number,
) {
  const params = new URLSearchParams({ page: String(page), per_page: String(PER_PAGE) });

  if (filters.type !== "all") params.set("type", filters.type);
  if (filters.reason) params.set("reason", filters.reason);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  return apiFetch<WalletTransactionsResponse>(`/me/transactions?${params.toString()}`, {
    token,
  });
}
