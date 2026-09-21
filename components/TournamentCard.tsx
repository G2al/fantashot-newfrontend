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
  const isLive = tournament.status === "in-progress";
  const isArchived = ["finished", "paid", "cancelled"].includes(tournament.status);

  return (
    <>
    {isArchived ? (
      <CompactTournamentRow tournament={tournament} countdown={countdown} />
    ) : null}
    <article
      className={`group overflow-hidden rounded-lg border bg-[#0F1E2E]/88 shadow-[0_16px_44px_rgba(0,0,0,0.25)] backdrop-blur-lg transition duration-200 ${isArchived ? "lg:hidden" : "lg:flex lg:flex-col"} ${getCardToneClassName(
        tournament.status,
      )}`}
    >
      <div className="relative hidden h-[132px] w-full shrink-0 items-center justify-center overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_50%_40%,rgba(34,230,195,0.2),rgba(6,17,27,0.92)_72%)] lg:flex">
        {coverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- host della copertina variabile per ambiente, evitiamo il whitelisting di next/image */}
            <img
              src={coverUrl}
              alt=""
              className={`absolute inset-0 h-full w-full object-cover ${isArchived ? "opacity-60 grayscale" : ""}`}
            />
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

        <div className="absolute left-2 top-2 hidden items-center gap-1.5 lg:flex">
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow-lg ${getStatusBadgeClassName(
            tournament.status,
          )}`}
        >
          {isLive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
          {STATUS_LABEL[tournament.status]}
        </span>
          {tournament.is_user_registered ? <RegisteredPill className="inline-flex py-1 shadow-lg" /> : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3.5 lg:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-[#22E6C3] lg:text-zinc-500">
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
            <h2 className="mt-1 line-clamp-2 text-base font-bold leading-tight text-white lg:text-xl">
              {tournament.title}
            </h2>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 lg:hidden">
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wide shadow ${getStatusBadgeClassName(
              tournament.status,
            )}`}
          >
            {isLive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : null}
            {STATUS_LABEL[tournament.status]}
          </span>
            {tournament.is_user_registered ? <RegisteredPill /> : null}
          </div>
        </div>

        <MobileLeagueSummary leagues={tournament.leagues} />

        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3">
          <Metric
            label="Montepremi"
            value={
              tournament.status === "enrollments" && tournament.prize_pool.amount === 0
                ? "In crescita"
                : formatPrizePool(tournament.prize_pool)
            }
          />
          <Metric label="Quota" value={formatMoney(tournament.buy_in)} />
          <Metric
            label="Iscritti"
            value={`${tournament.enrolled_users_count}/${tournament.max_participants}`}
          />
        </div>
        {tournament.status === "enrollments" && tournament.max_participants > 0 ? (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10" title="Posti occupati">
            <div
              className="h-full rounded-full bg-[#22E6C3]"
              style={{
                width: `${Math.min(100, Math.round((tournament.enrolled_users_count / tournament.max_participants) * 100))}%`,
              }}
            />
          </div>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0 text-[11px] text-zinc-500">
            <CardFooterInfo tournament={tournament} countdown={countdown} />
          </div>

          <Link
            href={`/tournaments/${tournament.id}`}
            className={`flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-xs font-bold transition ${getActionClassName(
              tournament,
            )}`}
          >
            {getActionLabel(tournament)}
          </Link>
        </div>
      </div>
    </article>
    </>
  );
}

/** Solo desktop: i tornei conclusi sono storico, una riga compatta basta. */
function CompactTournamentRow({
  tournament,
  countdown,
}: {
  tournament: Tournament;
  countdown: string | null;
}) {
  return (
    <article
      className={`hidden items-center gap-5 rounded-lg border bg-[#0F1E2E]/88 px-4 py-3 transition lg:grid lg:grid-cols-[minmax(0,1.5fr)_110px_90px_minmax(0,1.3fr)_auto] ${getCardToneClassName(
        tournament.status,
      )}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${getStatusBadgeClassName(
              tournament.status,
            )}`}
          >
            {STATUS_LABEL[tournament.status]}
          </span>
          {tournament.is_user_registered ? <RegisteredPill /> : null}
        </div>
        <h2 className="mt-1 truncate text-base font-bold text-white">{tournament.title}</h2>
        <div className="mt-1.5 flex items-center gap-1.5">
          {tournament.leagues.slice(0, 6).map((league) => (
            <LeagueLogo key={league.id} logoUrl={league.logo} label={league.name} />
          ))}
        </div>
      </div>
      <Metric label="Montepremi" value={formatPrizePool(tournament.prize_pool)} />
      <Metric
        label="Iscritti"
        value={`${tournament.enrolled_users_count}/${tournament.max_participants}`}
      />
      <div className="min-w-0 text-[11px] text-zinc-500">
        <CardFooterInfo tournament={tournament} countdown={countdown} />
      </div>
      <Link
        href={`/tournaments/${tournament.id}`}
        className={`flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-xs font-bold transition ${getActionClassName(
          tournament,
        )}`}
      >
        {getActionLabel(tournament)}
      </Link>
    </article>
  );
}

function RegisteredPill({ className = "inline-flex" }: { className?: string }) {
  return (
    <span
      className={`items-center gap-1 rounded-full border border-[#1D6D68] bg-[#123A3B] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#3AF5D4] ${className}`}
    >
      <svg aria-hidden="true" className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12l5 5 9-10" />
      </svg>
      Iscritto
    </span>
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
     <div
        className="flex shrink-0 items-center gap-1.5 pl-1"
        aria-hidden="true"
      >
        {visibleLeagues.map((league) => (
          <div
            key={league.id}
            className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#0F1E2E] bg-[#101D2C] shadow-md"
          >
            <LeagueLogo logoUrl={league.logo} label={league.name} />
          </div>
        ))}
        {hiddenLeagueCount > 0 ? (
         <span className="grid h-8 min-w-8 place-items-center rounded-full border-2 border-[#0F1E2E] bg-[#123A3B] px-1 text-[10px] font-black text-[#3AF5D4] shadow-md">
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
  if (tournament.status === "enrollments") {
    return tournament.is_user_registered ? "Apri torneo" : "Iscriviti";
  }

  if (tournament.status === "in-progress") return "Segui live";
  if (tournament.status === "finished" || tournament.status === "paid") {
    return "Vedi risultati";
  }

  return tournament.is_user_registered ? "Apri torneo" : "Dettagli";
}

/** Solo l'azione "Iscriviti" e' piena: e' l'unico CTA che porta un ricavo. */
function getActionClassName(tournament: Tournament) {
  if (tournament.status === "enrollments" && !tournament.is_user_registered) {
    return "bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] text-[#06111B] shadow-[0_8px_24px_rgba(34,230,195,0.25)] hover:from-[#1ED8B7] hover:to-[#22E6C3]";
  }

  if (["finished", "paid", "cancelled"].includes(tournament.status)) {
    return "border border-white/15 text-zinc-300 hover:bg-white/5";
  }

  return "border border-[#22E6C3] bg-[#123A3B] text-[#22E6C3] hover:bg-[#22E6C3]/20";
}

/** Bordo/alone per stato: aperti e live risaltano, i chiusi arretrano. */
function getCardToneClassName(status: TournamentStatus) {
  if (status === "enrollments") {
    return "border-[#22E6C3]/30 hover:-translate-y-0.5 hover:border-[#22E6C3]/50 hover:shadow-[0_18px_52px_rgba(34,230,195,0.12)]";
  }
  if (status === "in-progress") {
    return "border-[#22E6C3]/50 shadow-[0_0_28px_rgba(34,230,195,0.14)] hover:-translate-y-0.5";
  }
  if (status === "paid") {
    return "border-amber-400/25 hover:border-amber-400/40";
  }
  return "border-white/10 hover:border-white/20";
}

function CardFooterInfo({
  tournament,
  countdown,
}: {
  tournament: Tournament;
  countdown: string | null;
}) {
  if (countdown) {
    return (
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          Chiusura tra
        </p>
        <p className="animate-countdown-beat origin-left font-mono text-xl font-black tabular-nums leading-tight text-[#3AF5D4] lg:text-2xl">
          {countdown}
        </p>
      </div>
    );
  }

  const isClosed = tournament.status === "finished" || tournament.status === "paid";

  if (isClosed && tournament.winner) {
    const winner = tournament.winner;
    const name = winner.user.username || winner.user.name || winner.team_name;

    return (
      <p className="flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-amber-400">
          <TrophyIcon />
        </span>
        <span className="truncate font-bold text-zinc-200">{name}</span>
        <span className="shrink-0 font-mono font-semibold text-amber-300">
          {winner.points.toLocaleString("it-IT", { maximumFractionDigits: 2 })} pt
        </span>
        {tournament.status === "paid" && winner.prize ? (
          <span className="shrink-0 text-zinc-500">· {formatMoney(winner.prize)}</span>
        ) : null}
      </p>
    );
  }

  if (tournament.status === "in-progress") {
    const leader = tournament.leader;
    const leaderName = leader
      ? leader.user.username || leader.user.name || leader.team_name
      : null;
    const total = tournament.fixtures_count ?? 0;
    const finished = tournament.fixtures_finished_count ?? 0;
    const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

    if (leader || total > 0) {
      return (
        <div className="min-w-0 space-y-1.5">
          {leader ? (
            <p className="flex min-w-0 items-center gap-1.5">
              <span className="shrink-0 text-[#22E6C3]">
                <TrophyIcon />
              </span>
              <span className="shrink-0 text-zinc-500">In testa</span>
              <span className="truncate font-bold text-zinc-200">{leaderName}</span>
              <span className="shrink-0 font-mono font-semibold text-[#22E6C3]">
                {leader.points.toLocaleString("it-IT", { maximumFractionDigits: 2 })} pt
              </span>
            </p>
          ) : null}
          {total > 0 ? (
            <div className="w-32">
              <p className="mb-1 truncate">
                {finished} su {total} partite
              </p>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#22E6C3]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      );
    }
  }

  return <p className="truncate">{getStatusHint(tournament.status)}</p>;
}

function TrophyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 2 2 3 3 0 0 1-3 3h-1M7 5H5a2 2 0 0 0-2 2 3 3 0 0 0 3 3h1" />
    </svg>
  );
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
  if (status === "paid") {
    return "border border-amber-400 bg-amber-400/15 text-amber-300";
  }
  if (status === "finished") {
    return "border border-white/25 bg-black/40 text-zinc-300";
  }
  return "bg-zinc-700 text-zinc-100";
}


