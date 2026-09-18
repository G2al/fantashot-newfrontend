"use client";

import Image from "next/image";
import Link from "next/link";
import { useCountdown } from "@/hooks/use-countdown";
import { formatMoney, formatPrizePool } from "@/lib/format";
import { LeagueLogo } from "@/components/lobby/shared";
import type { Tournament, TournamentStatus } from "@/types/tournament";

const STATUS_LABEL: Record<TournamentStatus, string> = {
  draft: "Bozza",
  ready: "Pronto",
  enrollments: "Iscrizioni aperte",
  "waiting-for-start": "In attesa",
  "in-progress": "In corso",
  finished: "Concluso",
  paid: "Premi pagati",
  cancelled: "Annullato",
};

export function TournamentCard({ tournament }: { tournament: Tournament }) {
  const countdown = useCountdown(
    tournament.status === "enrollments"
      ? tournament.enrollments_end_date
      : null,
  );
  const primaryLeague = tournament.leagues[0] ?? null;
  const isMultiLeague = tournament.leagues.length > 1;

  return (
    <article className="group flex min-h-[132px] overflow-hidden rounded-lg border border-white/10 bg-[#1c0b09]/88 shadow-[0_16px_44px_rgba(0,0,0,0.25)] backdrop-blur-lg transition duration-200 hover:-translate-y-0.5 hover:border-red-500/30 hover:shadow-[0_18px_52px_rgba(220,38,38,0.12)] lg:min-h-0 lg:flex-col">
      <div className="relative flex w-[96px] shrink-0 items-center justify-center overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_50%_40%,rgba(220,38,38,0.2),rgba(17,7,7,0.92)_72%)] lg:h-[132px] lg:w-full lg:border-b lg:border-r-0">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        {primaryLeague ? (
          <div className="relative rounded-2xl border border-white/10 bg-black/20 p-3 shadow-xl lg:p-4">
            <LeagueLogo
              logoUrl={primaryLeague.logo}
              label={primaryLeague.name}
              large
            />
          </div>
        ) : (
          <Image
            src="/images/sport-football.png"
            alt="Calcio"
            width={54}
            height={54}
            className="relative object-contain opacity-80"
          />
        )}

        <span
          className={`absolute left-2 top-2 hidden rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide lg:block ${getStatusBadgeClassName(
            tournament.status,
          )}`}
        >
          {STATUS_LABEL[tournament.status]}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 lg:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-red-300/80">
              {isMultiLeague
                ? `Multi-campionato · ${tournament.leagues.length} leghe`
                : (primaryLeague?.name ?? "Campionato da definire")}
            </p>
            <h2 className="mt-1 line-clamp-2 text-base font-bold leading-tight text-white lg:text-lg">
              {tournament.title}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-wide lg:hidden ${getStatusBadgeClassName(
              tournament.status,
            )}`}
          >
            {STATUS_LABEL[tournament.status]}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
          <Metric
            label="Montepremi"
            value={formatPrizePool(tournament.prize_pool)}
          />
          <Metric label="Quota" value={formatMoney(tournament.buy_in)} />
          <Metric
            label="Iscritti"
            value={`${tournament.enrolled_users_count}/${tournament.max_participants}`}
          />
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0 text-[11px] text-zinc-500">
            {countdown ? (
              <p className="truncate">
                Chiusura tra{" "}
                <span className="font-mono font-semibold text-red-300">
                  {countdown}
                </span>
              </p>
            ) : (
              <p className="truncate">{getStatusHint(tournament.status)}</p>
            )}
          </div>

          <Link
            href={`/tournaments/${tournament.id}`}
            className={`flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-xs font-bold transition ${
              tournament.is_user_registered
                ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.25)] hover:from-red-400 hover:to-red-500"
            }`}
          >
            {getActionLabel(tournament)}
          </Link>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-zinc-200 lg:text-sm">
        {value}
      </p>
    </div>
  );
}

function getActionLabel(tournament: Tournament) {
  if (tournament.is_user_registered) {
    return "Apri torneo";
  }

  if (tournament.status === "enrollments") {
    return "Iscriviti";
  }

  return "Dettagli";
}

function getStatusHint(status: TournamentStatus) {
  if (status === "waiting-for-start") return "In attesa del calcio d'inizio";
  if (status === "in-progress") return "Torneo in corso";
  if (status === "finished" || status === "paid") return "Torneo concluso";
  if (status === "cancelled") return "Torneo annullato";
  return "Informazioni torneo";
}

function getStatusBadgeClassName(status: TournamentStatus) {
  if (status === "enrollments") {
    return "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20";
  }
  if (status === "in-progress") {
    return "bg-red-600 text-white";
  }
  if (status === "waiting-for-start" || status === "ready") {
    return "bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/20";
  }
  if (status === "cancelled") {
    return "bg-zinc-800/60 text-zinc-500 line-through decoration-zinc-600";
  }
  return "bg-zinc-800/90 text-zinc-300 ring-1 ring-white/10";
}
