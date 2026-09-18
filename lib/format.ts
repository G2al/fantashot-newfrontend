import type { Money } from "@/types/tournament";

export function formatMoney(money: Money) {
  const value = money.amount / 10 ** money.decimal_places;

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: money.currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : money.decimal_places,
  }).format(value);
}

/** Un montepremi e' sempre presentato come valore positivo, anche se il
 * backend lo deriva da movimenti wallet registrati con segno negativo. */
export function formatPrizePool(money: Money) {
  return formatMoney({ ...money, amount: Math.abs(money.amount) });
}
