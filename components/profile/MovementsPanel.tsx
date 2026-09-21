"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { getWalletTransactions } from "@/lib/api/wallet";
import { getApiDateTimeMs } from "@/lib/date-time";
import { formatMoney } from "@/lib/format";
import type {
  WalletTransaction,
  WalletTransactionFilters,
  WalletTransactionsResponse,
} from "@/types/wallet";

const TYPE_OPTIONS: Array<{ value: WalletTransactionFilters["type"]; label: string }> = [
  { value: "all", label: "Tutti" },
  { value: "in", label: "Entrate" },
  { value: "out", label: "Uscite" },
];

const PERIOD_OPTIONS: Array<{ id: string; label: string; days: number | null }> = [
  { id: "all", label: "Sempre", days: null },
  { id: "7", label: "7 giorni", days: 7 },
  { id: "30", label: "30 giorni", days: 30 },
  { id: "90", label: "90 giorni", days: 90 },
  { id: "custom", label: "Personalizzato", days: null },
];

const REASON_LABEL: Record<string, string> = {
  deposit: "Ricarica",
  enrollment: "Iscrizione torneo",
  prize: "Premio",
  refund: "Rimborso",
  withdrawal: "Prelievo",
  adjustment: "Rettifica",
};

const REASON_FILTERS = ["deposit", "enrollment", "prize", "refund", "withdrawal"];

const EMPTY_FILTERS: WalletTransactionFilters = { type: "all", reason: "", from: "", to: "" };

export function MovementsPanel() {
  const [filters, setFilters] = useState<WalletTransactionFilters>(EMPTY_FILTERS);
  const [period, setPeriod] = useState("all");

  function update(patch: Partial<WalletTransactionFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function selectPeriod(id: string, days: number | null) {
    setPeriod(id);

    if (id === "custom") return;

    if (days === null) {
      update({ from: "", to: "" });
      return;
    }

    const from = new Date();
    from.setDate(from.getDate() - days);
    update({ from: toDateInput(from), to: "" });
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setPeriod("all");
  }

  const hasFilters =
    filters.type !== "all" || Boolean(filters.reason) || Boolean(filters.from) || Boolean(filters.to);

  return (
    <div>
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#0F1E2E]/88 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-white/10 bg-[#06111B] p-1">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ type: option.value })}
                aria-pressed={filters.type === option.value}
                className={`h-8 rounded-md px-3.5 text-xs font-black uppercase tracking-wide transition ${
                  filters.type === option.value
                    ? "bg-[#22E6C3] text-[#06111B]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-xs font-bold text-[#3AF5D4] transition hover:text-[#E9FFFA]"
            >
              Azzera filtri
            </button>
          ) : null}
        </div>

        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {PERIOD_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              active={period === option.id}
              onClick={() => selectPeriod(option.id, option.days)}
            >
              {option.label}
            </Chip>
          ))}
        </div>

        {period === "custom" ? (
          <div className="grid grid-cols-2 gap-2 sm:max-w-md">
            <DateField label="Dal" value={filters.from} max={filters.to} onChange={(from) => update({ from })} />
            <DateField label="Al" value={filters.to} min={filters.from} onChange={(to) => update({ to })} />
          </div>
        ) : null}

        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!filters.reason} onClick={() => update({ reason: "" })}>
            Tutte le causali
          </Chip>
          {REASON_FILTERS.map((reason) => (
            <Chip
              key={reason}
              active={filters.reason === reason}
              onClick={() => update({ reason: filters.reason === reason ? "" : reason })}
            >
              {REASON_LABEL[reason]}
            </Chip>
          ))}
        </div>
      </div>

      <MovementsList
        key={`${filters.type}|${filters.reason}|${filters.from}|${filters.to}`}
        filters={filters}
        hasFilters={hasFilters}
        onReset={reset}
      />
    </div>
  );
}

function MovementsList({
  filters,
  hasFilters,
  onReset,
}: {
  filters: WalletTransactionFilters;
  hasFilters: boolean;
  onReset: () => void;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [summary, setSummary] = useState<WalletTransactionsResponse["summary"]>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<"unavailable" | "generic" | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;

    let isActive = true;
    void Promise.resolve()
      .then(() => getWalletTransactions(token, filters, page))
      .then((response) => {
        if (!isActive) return;
        setItems((current) => (page === 1 ? response.data : [...current, ...response.data]));
        setLastPage(response.meta?.last_page ?? 1);
        setSummary(response.summary ?? null);
        setError(null);
      })
      .catch((requestError) => {
        if (!isActive) return;
        setError(
          requestError instanceof ApiError && [404, 405].includes(requestError.status)
            ? "unavailable"
            : "generic",
        );
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
    // `page`/`attempt` guidano i caricamenti; i filtri cambiano solo con il remount (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, attempt]);

  function loadMore() {
    setIsLoading(true);
    setPage((current) => current + 1);
  }

  function retry() {
    setIsLoading(true);
    setError(null);
    setPage(1);
    setAttempt((current) => current + 1);
  }

  if (isLoading && items.length === 0) {
    return (
      <div className="mt-4 space-y-2" aria-label="Caricamento movimenti">
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="h-16 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (error === "unavailable") {
    return (
      <StateBox
        title="Storico movimenti non ancora disponibile"
        text="Questa sezione si attiverà appena il servizio dei movimenti sarà pronto."
      />
    );
  }

  if (error && items.length === 0) {
    return (
      <StateBox
        title="Impossibile caricare i movimenti"
        text="Controlla la connessione e riprova."
        action={
          <button
            type="button"
            onClick={retry}
            className="mt-3 h-10 rounded-lg border border-[#22E6C3] bg-[#123A3B] px-4 text-xs font-black uppercase tracking-wide text-[#22E6C3]"
          >
            Riprova
          </button>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <StateBox
        title={hasFilters ? "Nessun movimento con questi filtri" : "Ancora nessun movimento"}
        text={
          hasFilters
            ? "Prova ad allargare il periodo o a togliere qualche filtro."
            : "Ricariche, iscrizioni e premi compariranno qui."
        }
        action={
          hasFilters ? (
            <button
              type="button"
              onClick={onReset}
              className="mt-3 h-10 rounded-lg border border-white/15 px-4 text-xs font-black uppercase tracking-wide text-zinc-200 hover:bg-white/5"
            >
              Azzera filtri
            </button>
          ) : null
        }
      />
    );
  }

  const groups = groupByDay(items);

  return (
    <div className="mt-4">
      {summary ? (
        <div className="mb-4 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-[#0F1E2E]/88 py-3">
          <SummaryTile label="Entrate" value={formatMoney(summary.total_in)} tone="in" />
          <SummaryTile label="Uscite" value={formatMoney(summary.total_out)} tone="out" />
          <SummaryTile
            label="Netto"
            value={formatMoney({
              ...summary.total_in,
              amount: summary.total_in.amount - summary.total_out.amount,
            })}
            tone="neutral"
          />
        </div>
      ) : null}

      <div className="space-y-5">
        {groups.map((group) => (
          <section key={group.key}>
            <h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
              {group.label}
            </h3>
            <ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-[#0F1E2E]/88">
              {group.items.map((transaction) => (
                <TransactionRow key={transaction.id} transaction={transaction} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      {page < lastPage ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={isLoading}
          className="mx-auto mt-5 flex h-11 items-center justify-center rounded-lg border border-white/15 px-6 text-xs font-black uppercase tracking-wide text-zinc-200 transition hover:bg-white/5 disabled:opacity-50"
        >
          {isLoading ? "Caricamento..." : "Carica altri movimenti"}
        </button>
      ) : null}
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: WalletTransaction }) {
  const isIn = transaction.direction === "in";
  const title = REASON_LABEL[transaction.reason] ?? transaction.reason;
  const detail = transaction.tournament?.title ?? transaction.description ?? null;
  const time = new Date(getApiDateTimeMs(transaction.created_at)).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <li className="flex items-center gap-3 px-3.5 py-3 sm:px-4">
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          isIn ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
        }`}
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isIn ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="truncate text-xs text-zinc-500">
          {time}
          {detail ? ` · ${detail}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-sm font-black tabular-nums ${isIn ? "text-green-400" : "text-red-400"}`}>
          {isIn ? "+" : "−"}
          {formatMoney(transaction.amount)}
        </p>
        {transaction.balance_after ? (
          <p className="text-[10px] text-zinc-500">Saldo {formatMoney(transaction.balance_after)}</p>
        ) : null}
      </div>
    </li>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "in" | "out" | "neutral";
}) {
  return (
    <div className="px-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 text-base font-black tabular-nums sm:text-lg ${
          tone === "in" ? "text-green-400" : tone === "out" ? "text-red-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StateBox({
  title,
  text,
  action = null,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-[#0F1E2E]/50 px-6 py-10 text-center">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs text-zinc-500">{text}</p>
      {action}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${
        active
          ? "border-[#22E6C3] bg-[#123A3B] text-[#E9FFFA]"
          : "border-white/10 bg-[#101D2C] text-zinc-300 hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</span>
      <input
        type="date"
        value={value}
        min={min || undefined}
        max={max || undefined}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-[#101D2C] px-3 text-sm text-zinc-100 outline-none focus:border-[#22E6C3]/50 [color-scheme:dark]"
      />
    </label>
  );
}

function toDateInput(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function groupByDay(items: WalletTransaction[]) {
  const groups = new Map<string, { key: string; label: string; items: WalletTransaction[] }>();

  items.forEach((transaction) => {
    const date = new Date(getApiDateTimeMs(transaction.created_at));
    const key = toDateInput(date);
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(transaction);
      return;
    }

    groups.set(key, {
      key,
      label: date.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }),
      items: [transaction],
    });
  });

  return Array.from(groups.values());
}
