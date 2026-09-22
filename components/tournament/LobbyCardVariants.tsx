"use client";

import Link from "next/link";
import { useCountdown } from "@/hooks/use-countdown";
import { resolveApiAssetUrl } from "@/lib/api";
import { formatMoney, formatPrizePool } from "@/lib/format";
import { getCountdownTarget, isFullForVisitor, isTournamentFull } from "@/lib/tournament-enrollment";
import {
  FullPill,
  RegisteredPill,
  STATUS_LABEL,
  getActionClassName,
  getActionLabel,
  getStatusBadgeClassName,
  getUserResult,
} from "@/components/TournamentCard";
import { LeagueLogo } from "@/components/lobby/shared";
import type { Tournament } from "@/types/tournament";

/**
 * Tre "livelli" di importanza, solo desktop: il live e' un hero a tutta
 * larghezza, gli aperti sono righe compatte con CTA in evidenza, i conclusi
 * sono card piccole senza copertina (sono storico, non devono competere per
 * attenzione). Il mobile resta la card unica di TournamentCard, invariata.
 */

export function LiveHeroCard({ tournament }: { tournament: Tournament }) {
  const coverUrl = resolveApiAssetUrl(tournament.cover_image_url);
  const result = getUserResult(tournament);
  const isOwnLead = result?.position === 1;
  const leader = tournament.leader;
  const total = tournament.fixtures_count ?? 0;
  const finished = tournament.fixtures_finished_count ?? 0;
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="animate-pulse-glow group relative block overflow-hidden rounded-xl border border-[#22E6C3]/50 bg-[#0F1E2E] shadow-[0_0_0_1px_rgba(34,230,195,0.35),0_20px_50px_rgba(0,0,0,0.35)] transition hover:border-[#22E6C3]/70"
    >
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(6,17,27,0.94)_0%,rgba(6,17,27,0.82)_38%,rgba(6,17,27,0.55)_100%)]" />

      <div className="relative grid grid-cols-[minmax(0,1.3fr)_auto_auto_auto] items-center gap-6 p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide shadow ${getStatusBadgeClassName(
                tournament.status,
              )}`}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              {STATUS_LABEL[tournament.status]}
            </span>
            {tournament.is_user_registered ? <RegisteredPill className="inline-flex py-1" /> : null}
          </div>
          <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {tournament.leagues.length > 1
              ? `Multi-campionato · ${tournament.leagues.length} campionati`
              : (tournament.leagues[0]?.name ?? "Campionato da definire")}
          </p>
          <h2 className="mt-0.5 truncate text-xl font-black text-white">{tournament.title}</h2>
          <div className="mt-2 flex items-center gap-1.5">
            {tournament.leagues.slice(0, 5).map((league) => (
              <LeagueLogo key={league.id} logoUrl={league.logo} label={league.name} />
            ))}
          </div>
        </div>

        {result || leader ? (
          <div className="flex items-center gap-2.5 border-l border-white/10 pl-6">
            <span className="text-amber-400">
              <TrophyIcon />
            </span>
            <div className="min-w-0">
              {result ? (
                <>
                  <p className="text-2xl font-black leading-none text-white">
                    {result.position}° <span className="text-sm font-bold text-zinc-500">su {tournament.enrolled_users_count}</span>
                  </p>
                  {result.points !== null ? (
                    <p className="mt-1 text-lg font-black leading-none text-[#3AF5D4]">
                      {formatPoints(result.points)} pt
                    </p>
                  ) : null}
                  <p className={`mt-1 text-xs font-bold ${isOwnLead ? "text-amber-300" : "text-zinc-500"}`}>
                    {isOwnLead ? "Sei in testa" : "La tua posizione"}
                  </p>
                </>
              ) : leader ? (
                <>
                  <p className="max-w-[140px] truncate text-base font-black text-white">
                    {leader.user.username || leader.user.name || leader.team_name}
                  </p>
                  <p className="mt-1 text-lg font-black leading-none text-[#3AF5D4]">
                    {formatPoints(leader.points)} pt
                  </p>
                  <p className="mt-1 text-xs font-bold text-zinc-500">In testa</p>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {total > 0 ? (
          <div className="w-32 border-l border-white/10 pl-6">
            <p className="mb-1.5 text-xs font-bold text-zinc-400">
              {finished}/{total} <span className="font-medium text-zinc-500">partite concluse</span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-[#22E6C3]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : null}

        <div className="flex items-center gap-5 border-l border-white/10 pl-6">
          <div className="hidden gap-4 xl:flex">
            <MiniMetric label="Montepremi" value={formatPrizePool(tournament.prize_pool)} />
            <MiniMetric label="Quota" value={formatMoney(tournament.buy_in)} />
            <MiniMetric
              label="Iscritti"
              value={`${tournament.enrolled_users_count}/${tournament.max_participants}`}
            />
          </div>
          <span className="flex h-11 shrink-0 items-center gap-2 rounded-lg bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] px-5 text-sm font-black uppercase tracking-wide text-[#06111B] shadow-[0_8px_24px_rgba(34,230,195,0.3)] transition group-hover:from-[#1ED8B7] group-hover:to-[#22E6C3]">
            <LiveIcon />
            Segui live
          </span>
        </div>
      </div>
    </Link>
  );
}

export function OpenTournamentCard({ tournament }: { tournament: Tournament }) {
  const coverUrl = resolveApiAssetUrl(tournament.cover_image_url);
  const countdownTarget = getCountdownTarget(tournament);
  const countdown = useCountdown(countdownTarget.target);
  const isFull = isTournamentFull(tournament);
  const isFullForOthers = isFullForVisitor(tournament);

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group flex items-stretch overflow-hidden rounded-xl border border-[#22E6C3]/25 bg-[#0F1E2E]/88 transition hover:border-[#22E6C3]/50 hover:shadow-[0_14px_38px_rgba(34,230,195,0.1)]"
    >
      <div className="relative w-28 shrink-0 overflow-hidden border-r border-white/8 bg-[radial-gradient(circle_at_50%_40%,rgba(34,230,195,0.18),rgba(6,17,27,0.92)_72%)]">
        {coverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/35" />
          </>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {tournament.leagues.length > 1
                ? `Multi-campionato · ${tournament.leagues.length} campionati`
                : (tournament.leagues[0]?.name ?? "Campionato da definire")}
            </p>
            {isFullForOthers ? <FullPill /> : null}
            {tournament.is_user_registered ? <RegisteredPill /> : null}
          </div>
          <h3 className="mt-0.5 truncate text-base font-black text-white">{tournament.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            {tournament.leagues.slice(0, 5).map((league) => (
              <LeagueLogo key={league.id} logoUrl={league.logo} label={league.name} />
            ))}
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-4 xl:flex">
          <MiniMetric
            label="Montepremi"
            value={
              tournament.prize_pool.amount === 0 ? "In crescita" : formatPrizePool(tournament.prize_pool)
            }
          />
          <MiniMetric label="Quota" value={formatMoney(tournament.buy_in)} />
          <MiniMetric
            label="Posti"
            value={`${tournament.enrolled_users_count}/${tournament.max_participants}`}
            tone={isFull ? "amber" : "default"}
          />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {countdown ? (
            <p className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
              <ClockIcon />
              {countdownTarget.label === "Inizia tra" ? "Inizia tra" : "Chiude tra"} {countdown}
            </p>
          ) : null}
          <span
            className={`flex h-10 items-center justify-center whitespace-nowrap rounded-lg px-4 text-xs font-black uppercase tracking-wide transition ${getActionClassName(
              tournament,
            )}`}
          >
            {getActionLabel(tournament)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ClosedTournamentCard({ tournament }: { tournament: Tournament }) {
  const result = getUserResult(tournament);
  const isFinal = ["finished", "paid"].includes(tournament.status);
  const isOwnWin = isFinal && result?.position === 1;
  const winner = tournament.winner;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className={`flex flex-col rounded-xl border bg-[#0F1E2E]/70 p-3.5 opacity-90 transition hover:opacity-100 ${
        tournament.status === "cancelled" ? "border-dashed border-white/10" : "border-white/10 hover:border-white/20"
      }`}
    >
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${getStatusBadgeClassName(
          tournament.status,
        )}`}
      >
        {STATUS_LABEL[tournament.status]}
      </span>

      <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {tournament.leagues.length > 1
          ? `Multi-campionato · ${tournament.leagues.length} campionati`
          : (tournament.leagues[0]?.name ?? "Campionato")}
      </p>
      <h3 className="mt-0.5 truncate text-sm font-black text-white">{tournament.title}</h3>

      <div className="mt-2 min-h-[18px]">
        {isOwnWin && result ? (
          <p className="flex items-center gap-1 text-xs">
            <span className="text-amber-400">
              <TrophyIcon />
            </span>
            <span className="font-black text-amber-300">Hai vinto</span>
            {result.points !== null ? (
              <span className="font-mono font-semibold text-amber-300">{formatPoints(result.points)} pt</span>
            ) : null}
          </p>
        ) : result ? (
          <p className="text-xs">
            <span className="font-black text-white">{result.position}° posto</span>
            {result.points !== null ? (
              <span className="ml-1.5 font-mono font-semibold text-zinc-400">{formatPoints(result.points)} pt</span>
            ) : null}
          </p>
        ) : winner ? (
          <p className="flex items-center gap-1 text-xs text-zinc-400">
            <span className="text-amber-400/70">
              <TrophyIcon />
            </span>
            <span className="truncate font-bold text-zinc-300">
              {winner.user.username || winner.user.name || winner.team_name}
            </span>
          </p>
        ) : null}
        {isOwnWin && result?.prize ? (
          <p className="mt-0.5 text-[11px] font-bold text-amber-400/80">Premio {formatMoney(result.prize)}</p>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-2.5">
        <MiniMetric label="Montepremi" value={formatPrizePool(tournament.prize_pool)} compact />
        <MiniMetric label="Quota" value={formatMoney(tournament.buy_in)} compact />
        <MiniMetric
          label="Iscritti"
          value={`${tournament.enrolled_users_count}/${tournament.max_participants}`}
          compact
        />
      </div>

      <span
        className={`mt-3 flex h-9 items-center justify-center rounded-md text-xs font-bold transition ${getActionClassName(
          tournament,
        )}`}
      >
        {getActionLabel(tournament)}
      </span>
    </Link>
  );
}

function MiniMetric({
  label,
  value,
  compact = false,
  tone = "default",
}: {
  label: string;
  value: string;
  compact?: boolean;
  tone?: "default" | "amber";
}) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 truncate font-semibold ${compact ? "text-xs" : "text-sm"} ${
          tone === "amber" ? "text-amber-300" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatPoints(points: number) {
  return points.toLocaleString("it-IT", { maximumFractionDigits: 2 });
}

function TrophyIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 2 2 3 3 0 0 1-3 3h-1M7 5H5a2 2 0 0 0-2 2 3 3 0 0 0 3 3h1" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="2.5" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
