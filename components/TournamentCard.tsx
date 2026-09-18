"use client";

import Image from "next/image";
import Link from "next/link";
import { useCountdown } from "@/hooks/use-countdown";
import { resolveApiAssetUrl } from "@/lib/api";
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
  const coverUrl = resolveApiAssetUrl(tournament.cover_image_url);

  return (
    <article className="group overflow-hidden rounded-lg border border-white/10 bg-[#0F1E2E]/88 shadow-[0_16px_44px_rgba(0,0,0,0.25)] backdrop-blur-lg transition duration-200 hover:-translate-y-0.5 hover:border-[#22E6C3]/30 hover:shadow-[0_18px_52px_rgba(34,230,195,0.12)] lg:flex lg:flex-col">
      <div className="relative hidden h-[132px] w-full shrink-0 items-center justify-center overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_50%_40%,rgba(34,230,195,0.2),rgba(6,17,27,0.92)_72%)] lg:flex">
        {coverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- host della copertina variabile per ambiente, evitiamo il whitelisting di next/image */}
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:22px_22px]" />
        )}
        {tournament.leagues.length ? (
          <div className="relative flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-black/30 p-2.5 shadow-xl backdrop-blur-sm lg:gap-2 lg:p-3">
            {tournament.leagues.map((league) => (
              <LeagueLogo
                key={league.id}
                logoUrl={league.logo}
                label={league.name}
                large={!isMultiLeague}
              />
            ))}
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
          className={`absolute left-2 top-2 hidden rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-lg lg:block ${getStatusBadgeClassName(
            tournament.status,
          )}`}
        >
          {STATUS_LABEL[tournament.status]}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 lg:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#22E6C3]">
              {isMultiLeague
                ? (
                    <>
                      <span className="lg:hidden">Multi-campionato</span>
                      <span className="hidden lg:inline">
                        Multi-campionato · {tournament.leagues.length} campionati
                      </span>
                    </>
                  )
                : (primaryLeague?.name ?? "Campionato da definire")}
            </p>
            <h2 className="mt-1 line-clamp-2 text-base font-bold leading-tight text-white lg:text-lg">
              {tournament.title}
            </h2>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide shadow lg:hidden ${getStatusBadgeClassName(
              tournament.status,
            )}`}
          >
            {STATUS_LABEL[tournament.status]}
          </span>
        </div>

        <MobileLeagueSummary leagues={tournament.leagues} />

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
                <span className="font-mono font-semibold text-[#22E6C3]">
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
                ? "border border-[#22E6C3] bg-[#123A3B] text-[#22E6C3] hover:bg-[#22E6C3]/20"
                : "bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] text-[#06111B] shadow-[0_8px_24px_rgba(34,230,195,0.25)] hover:from-[#1ED8B7] hover:to-[#22E6C3]"
            }`}
          >
            {getActionLabel(tournament)}
          </Link>
        </div>
      </div>
    </article>
  );
}

function MobileLeagueSummary({ leagues }: { leagues: Tournament["leagues"] }) {
  if (!leagues.length) return null;

  const visibleLeagues = leagues.slice(0, 3);
  const hiddenLeagueCount = leagues.length - visibleLeagues.length;

  return (
    <div
      className="mt-3 flex min-w-0 items-center gap-2 lg:hidden"
      aria-label={
        leagues.length === 1
          ? `Campionato ${leagues[0].name}`
          : `${leagues.length} campionati nel torneo`
      }
    >
      <div className="flex shrink-0 items-center pl-1" aria-hidden="true">
        {visibleLeagues.map((league, index) => (
          <div
            key={league.id}
            className={`grid h-8 w-8 place-items-center rounded-full border-2 border-[#0F1E2E] bg-[#101D2C] shadow-md ${index ? "-ml-2" : ""}`}
          >
            <LeagueLogo logoUrl={league.logo} label={league.name} />
          </div>
        ))}
        {hiddenLeagueCount > 0 ? (
          <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full border-2 border-[#0F1E2E] bg-[#123A3B] px-1 text-[10px] font-black text-[#3AF5D4] shadow-md">
            +{hiddenLeagueCount}
          </span>
        ) : null}
      </div>
      <span className="truncate text-xs font-bold text-zinc-300">
        {leagues.length === 1
          ? leagues[0].name
          : `${leagues.length} campionati`}
      </span>
    </div>
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
    return "border border-[#22E6C3] bg-[#123A3B] text-[#22E6C3]";
  }
  if (status === "in-progress") {
    return "border border-[#18C6A7] bg-[#123A3B] text-[#18C6A7]";
  }
  if (status === "waiting-for-start" || status === "ready") {
    return "bg-amber-400 text-black";
  }
  if (status === "cancelled") {
    return "bg-zinc-700 text-zinc-300 line-through decoration-zinc-500";
  }
  return "bg-zinc-700 text-zinc-100";
}
