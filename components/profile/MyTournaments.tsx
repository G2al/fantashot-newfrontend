"use client";

import Link from "next/link";
import { useState } from "react";
import { LeagueLogo } from "@/components/lobby/shared";
import { STATUS_LABEL, getStatusBadgeClassName, getUserResult } from "@/components/TournamentCard";
import { formatMoney, formatPrizePool } from "@/lib/format";
import type { Tournament } from "@/types/tournament";

type GroupFilter = "all" | "open" | "live" | "closed";

const FILTERS: Array<{ id: GroupFilter; label: string }> = [
  { id: "all", label: "Tutti" },
  { id: "open", label: "Aperti" },
  { id: "live", label: "In corso" },
  { id: "closed", label: "Conclusi" },
];

export function getGroup(tournament: Tournament): Exclude<GroupFilter, "all"> {
  if (tournament.status === "in-progress") return "live";
  if (["finished", "paid", "cancelled"].includes(tournament.status)) return "closed";
  return "open";
}

export function MyTournaments({
  tournaments,
  userId,
}: {
  tournaments: Tournament[];
  userId: number | undefined;
}) {
  const [filter, setFilter] = useState<GroupFilter>("all");
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const visible = tournaments.filter(
    (tournament) =>
      (filter === "all" || getGroup(tournament) === filter) &&
      (!query || tournament.title.toLowerCase().includes(query)),
  );

  return (
    <div>
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#0F1E2E]/88 p-3 sm:flex sm:items-center sm:justify-between sm:space-y-0 sm:p-4">
        <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
          {FILTERS.map((item) => {
            const count =
              item.id === "all"
                ? tournaments.length
                : tournaments.filter((tournament) => getGroup(tournament) === item.id).length;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-bold transition ${
                  filter === item.id
                    ? "border-[#22E6C3] bg-[#123A3B] text-[#E9FFFA]"
                    : "border-white/10 bg-[#101D2C] text-zinc-300 hover:border-white/25"
                }`}
              >
                {item.label} <span className="ml-1 text-zinc-500">{count}</span>
              </button>
            );
          })}
        </div>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca torneo"
          aria-label="Cerca tra i tuoi tornei"
          className="h-10 w-full rounded-lg border border-white/10 bg-[#101D2C] px-3.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-[#22E6C3]/50 sm:w-64"
        />
      </div>

      {visible.length ? (
        <ul className="mt-4 space-y-2.5">
          {visible.map((tournament) => (
            <TournamentRow key={tournament.id} tournament={tournament} userId={userId} />
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/15 bg-[#0F1E2E]/50 px-6 py-10 text-center">
          <p className="text-sm font-black text-white">
            {tournaments.length ? "Nessun torneo con questi filtri" : "Non ti sei ancora iscritto a nessun torneo"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {tournaments.length
              ? "Prova a cambiare stato o ricerca."
              : "Scegli un torneo aperto e crea la tua formazione."}
          </p>
          {tournaments.length ? null : (
            <Link
              href="/dashboard"
              className="mt-4 inline-flex h-10 items-center rounded-lg bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] px-4 text-xs font-black uppercase tracking-wide text-[#06111B]"
            >
              Vai ai tornei
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function TournamentRow({ tournament, userId }: { tournament: Tournament; userId: number | undefined }) {
  const group = getGroup(tournament);
  const winner = tournament.winner;
  const result = getUserResult(tournament);
  const isFinal = ["finished", "paid"].includes(tournament.status);
  const isWinner =
    isFinal &&
    (result ? result.position === 1 : Boolean(winner && userId && winner.user.id === userId));

  return (
    <li>
      <Link
        href={`/tournaments/${tournament.id}`}
        className={`grid gap-3 rounded-xl border bg-[#0F1E2E]/88 p-3.5 transition hover:border-[#22E6C3]/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-4 ${
          isWinner ? "border-amber-400/40" : "border-white/10"
        } ${group === "closed" && !isWinner ? "opacity-90" : ""}`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${getStatusBadgeClassName(
                tournament.status,
              )}`}
            >
              {group === "live" ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
              {STATUS_LABEL[tournament.status]}
            </span>
            {isWinner ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-400 bg-amber-400/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-300">
                Vincitore
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 truncate text-base font-bold text-white">{tournament.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            {tournament.leagues.slice(0, 6).map((league) => (
              <LeagueLogo key={league.id} logoUrl={league.logo} label={league.name} />
            ))}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-4 text-left sm:flex sm:items-center sm:gap-6">
          <Stat label="Quota" value={formatMoney(tournament.buy_in)} />
          <Stat label="Montepremi" value={formatPrizePool(tournament.prize_pool)} />
          {result ? (
            <Stat
              label={isWinner ? "Hai vinto" : "Il tuo piazzamento"}
              value={`${result.position}° su ${tournament.enrolled_users_count}${
                result.points !== null
                  ? ` · ${result.points.toLocaleString("it-IT", { maximumFractionDigits: 2 })} pt`
                  : ""
              }${result.prize ? ` · ${formatMoney(result.prize)}` : ""}`}
              highlight={isWinner}
            />
          ) : (
            <Stat
              label={winner && group === "closed" ? "Vincitore" : "Iscritti"}
              value={
                winner && group === "closed"
                  ? winner.user.username || winner.user.name
                  : `${tournament.enrolled_users_count}/${tournament.max_participants}`
              }
            />
          )}
        </dl>
      </Link>
    </li>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="min-w-0 sm:min-w-[84px]">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={`truncate text-sm font-black ${highlight ? "text-amber-300" : "text-white"}`}>{value}</dd>
    </div>
  );
}
