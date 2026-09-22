"use client";

import { useEffect, useState } from "react";
import {
  SubstitutionLink,
  getSubstitutionContext,
  type SubstitutionContext,
} from "@/components/tournament/SubstitutionsPanel";
import { TeamBuilder } from "@/components/tournament/TeamBuilder";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import {
  getTournamentPlayerDetails,
  getTournamentTeamDetails,
} from "@/lib/api/tournaments";
import { logFrontendError } from "@/lib/frontend-logger";
import type {
  FantaTeamFormationEntry,
  PlayerPosition,
  TournamentDetail,
  TournamentPlayerDetails,
  TournamentTeamDetails,
} from "@/types/tournament";

const NOT_STARTED_MESSAGE = "Tournament has not started yet";

export function TeamPreviewModal({
  tournament,
  teamId,
  title,
  subtitle,
  onClose,
}: {
  tournament: TournamentDetail;
  teamId: number;
  title?: string;
  subtitle?: string | null;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [team, setTeam] = useState<TournamentTeamDetails | null>(null);
  const [error, setError] = useState<"not-started" | "generic" | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<{
    fantaLineupId: number;
    name: string;
    entry: FantaTeamFormationEntry;
  } | null>(null);

  function handlePlayerInspect(entry: FantaTeamFormationEntry) {
    // Il contratto corrente espone fanta_lineup_id; il fallback su id rende
    // compatibile anche la nuova forma formation/bench descritta dal backend.
    const fantaLineupId = entry.fanta_lineup_id ?? entry.id;
    if (!Number.isInteger(fantaLineupId) || fantaLineupId <= 0) return;

    setSelectedPlayer({ fantaLineupId, name: entry.name, entry });
  }

  useEffect(() => {
    let isActive = true;

    getTournamentTeamDetails(tournament.id, teamId, token)
      .then((data) => {
        if (isActive) setTeam(data);
      })
      .catch((requestError) => {
        if (!isActive) return;

        if (
          requestError instanceof ApiError &&
          requestError.status === 403 &&
          requestError.message === NOT_STARTED_MESSAGE
        ) {
          setError("not-started");
          return;
        }

        logFrontendError(
          "Caricamento della formazione squadra non riuscito",
          { tournamentId: tournament.id, teamId },
          requestError
        );
        setError("generic");
      });

    return () => {
      isActive = false;
    };
  }, [tournament.id, teamId, token]);

  return (
    <>
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
        className="relative flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden sm:max-w-5xl rounded-t-2xl bg-[#06111B] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#0A1420] px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">
              {title ?? team?.name ?? "Formazione"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {subtitle ?? team?.user.name ?? " "}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {team ? (
              <span className="text-lg font-black text-white">
                {team.points.toLocaleString("it-IT", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
                <span className="ml-1 text-xs font-bold text-zinc-500">pt</span>
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-zinc-300 hover:bg-white/10"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {error === "not-started" ? (
            <StatusMessage
              icon={<LockIcon />}
              message="Le formazioni saranno visibili all'avvio del torneo."
            />
          ) : error === "generic" ? (
            <StatusMessage
              icon={<AlertIcon />}
              message="Impossibile caricare la formazione. Riprova più tardi."
            />
          ) : !team ? (
            <div className="space-y-3" aria-label="Caricamento formazione">
              <div className="h-64 animate-pulse rounded-xl bg-white/5" />
              <div className="h-20 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : (
            <TeamBuilder
              tournament={tournament}
              mode="view"
              viewTeam={{ module_id: team.module_id, formation_data: team.formation_data }}
              onPlayerInspect={handlePlayerInspect}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
    {selectedPlayer ? (
      <PlayerStatisticsModal
        tournamentId={tournament.id}
        teamId={teamId}
        fantaLineupId={selectedPlayer.fantaLineupId}
        fallbackName={selectedPlayer.name}
        substitution={
          team ? getSubstitutionContext(team.formation_data, selectedPlayer.entry) : null
        }
        onOpenPartner={handlePlayerInspect}
        onClose={() => setSelectedPlayer(null)}
      />
    ) : null}
    </>
  );
}

export function PlayerStatisticsModal({
  tournamentId,
  teamId,
  fantaLineupId,
  fallbackName,
  substitution = null,
  onOpenPartner,
  onClose,
}: {
  tournamentId: number;
  teamId: number;
  fantaLineupId: number;
  fallbackName: string;
  substitution?: SubstitutionContext | null;
  onOpenPartner?: (entry: FantaTeamFormationEntry) => void;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [details, setDetails] = useState<TournamentPlayerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    setDetails(null);
    setError(null);
    setIsLoading(true);

    getTournamentPlayerDetails(tournamentId, teamId, fantaLineupId, token)
      .then((data) => {
        if (isActive) setDetails(data);
      })
      .catch((requestError) => {
        if (!isActive) return;
        logFrontendError(
          "Caricamento statistiche giocatore non riuscito",
          { tournamentId, teamId, fantaLineupId },
          requestError
        );
        setError("Impossibile caricare le statistiche del giocatore.");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [fantaLineupId, teamId, token, tournamentId]);

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Chiudi statistiche giocatore"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-statistics-title"
        className="thin-scrollbar relative max-h-[88dvh] w-full overflow-y-auto rounded-t-2xl border-t border-[#1E3448] bg-[#0F1E2E] shadow-2xl sm:max-w-lg sm:rounded-2xl sm:border"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0F1E2E]/95 px-4 py-4 backdrop-blur sm:px-5">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#22E6C3]">
              Dettaglio giocatore
            </p>
            <h2 id="player-statistics-title" className="truncate text-lg font-black text-white">
              {details?.player.display_name ?? fallbackName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-[#101D2C] text-zinc-300 transition hover:border-[#22E6C3]/40 hover:text-white"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-5">
          {substitution ? (
            <SubstitutionLink context={substitution} onOpenPartner={onOpenPartner} />
          ) : null}
          {isLoading ? (
            <PlayerStatisticsSkeleton />
          ) : error ? (
            <StatusMessage icon={<AlertIcon />} message={error} />
          ) : details ? (
            <PlayerStatisticsContent details={details} />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function PlayerStatisticsContent({ details }: { details: TournamentPlayerDetails }) {
  const breakdown = details.points_breakdown;
  const [filter, setFilter] = useState<"all" | "bonus" | "malus">("all");

  const bonusRows = details.statistics.filter((statistic) => Number(statistic.points) > 0);
  const malusRows = details.statistics.filter((statistic) => Number(statistic.points) < 0);
  const visibleRows =
    filter === "bonus" ? bonusRows : filter === "malus" ? malusRows : details.statistics;

  // Proporzioni della barra: sui valori assoluti, cosi' un malus grande si vede
  // anche se il totale netto e' piccolo o negativo.
  const magnitude =
    Math.abs(breakdown.base_points) + Math.abs(breakdown.bonus_points) + Math.abs(breakdown.penalties_points);
  const baseShare = magnitude ? (Math.abs(breakdown.base_points) / magnitude) * 100 : 0;
  const bonusShare = magnitude ? (Math.abs(breakdown.bonus_points) / magnitude) * 100 : 0;
  const malusShare = magnitude ? (Math.abs(breakdown.penalties_points) / magnitude) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-[#1E3448] bg-[#101D2C] p-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-[#22E6C3] bg-[#06111B] text-sm font-black text-white">
          {details.player.image_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={details.player.image_path}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            getInitials(details.player.display_name)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black text-white">
            {details.player.display_name}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
            <span>{getPositionLabel(details.player.position)}</span>
            <span aria-hidden="true">·</span>
            <span>{details.minutes_played} min</span>
            {details.is_captain ? (
              <span className="rounded-full bg-amber-400 px-2 py-0.5 text-black">Capitano</span>
            ) : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-black text-[#3AF5D4]">
            {formatPoints(breakdown.total_points)}
          </p>
          <p className="text-[9px] font-black uppercase tracking-wide text-zinc-500">Punti</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#1E3448] bg-[#101D2C] p-3.5">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-black/40">
          {baseShare ? <div className="h-full bg-zinc-400" style={{ width: `${baseShare}%` }} /> : null}
          {bonusShare ? <div className="h-full bg-green-400" style={{ width: `${bonusShare}%` }} /> : null}
          {malusShare ? <div className="h-full bg-red-400" style={{ width: `${malusShare}%` }} /> : null}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <BreakdownStat label="Base" value={breakdown.base_points} dotClassName="bg-zinc-400" tone="neutral" />
          <BreakdownStat
            label="Bonus"
            value={breakdown.bonus_points}
            dotClassName="bg-green-400"
            tone="positive"
          />
          <BreakdownStat
            label="Malus"
            value={breakdown.penalties_points}
            dotClassName="bg-red-400"
            tone="negative"
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-[#1E3448] bg-[#101D2C]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-[0.12em] text-white">
            Statistiche partita
          </h3>
          <div className="inline-flex rounded-lg border border-white/10 bg-[#06111B] p-1">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              Tutte
            </FilterTab>
            <FilterTab active={filter === "bonus"} onClick={() => setFilter("bonus")} disabled={!bonusRows.length}>
              Bonus <span className="opacity-60">{bonusRows.length}</span>
            </FilterTab>
            <FilterTab active={filter === "malus"} onClick={() => setFilter("malus")} disabled={!malusRows.length}>
              Malus <span className="opacity-60">{malusRows.length}</span>
            </FilterTab>
          </div>
        </div>
        {visibleRows.length ? (
          <div className="divide-y divide-white/[0.06]">
            {visibleRows.map((statistic, index) => {
              const points = Number(statistic.points);

              return (
                <div
                  key={`${statistic.type}-${index}`}
                  className={`grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-l-2 px-4 py-3 text-sm ${
                    points > 0
                      ? "border-l-green-500/50 bg-green-500/[0.04]"
                      : points < 0
                        ? "border-l-red-500/50 bg-red-500/[0.04]"
                        : "border-l-transparent"
                  }`}
                >
                  <span className="truncate font-semibold text-zinc-300">{statistic.label}</span>
                  <span className="font-black text-white">{formatStatisticValue(statistic.value)}</span>
                  <span className={`min-w-12 text-right text-xs font-black ${getPointsTone(points)}`}>
                    {formatSignedPoints(points)} pt
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-zinc-500">
            {filter === "all"
              ? "Nessuna statistica registrata per questo giocatore."
              : filter === "bonus"
                ? "Nessun bonus in questa partita."
                : "Nessun malus in questa partita."}
          </p>
        )}
      </section>
    </div>
  );
}

function FilterTab({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`h-7 rounded-md px-2.5 text-[10px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-30 ${
        active ? "bg-[#22E6C3] text-[#06111B]" : "text-zinc-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function BreakdownStat({
  label,
  value,
  dotClassName,
  tone,
}: {
  label: string;
  value: number;
  dotClassName: string;
  tone: "neutral" | "positive" | "negative";
}) {
  const toneClass = {
    neutral: "text-white",
    positive: "text-green-400",
    negative: "text-red-400",
  }[tone];

  return (
    <div>
      <p className="flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-zinc-500">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
        {label}
      </p>
      <p className={`mt-1 text-base font-black ${toneClass}`}>
        {tone === "neutral" ? formatPoints(value) : formatSignedPoints(value)}
      </p>
    </div>
  );
}

function PlayerStatisticsSkeleton() {
  return (
    <div className="space-y-4" aria-label="Caricamento statistiche giocatore">
      <div className="h-20 animate-pulse rounded-xl bg-white/5" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-white/5" />
        <div className="h-16 animate-pulse rounded-xl bg-white/5" />
        <div className="h-16 animate-pulse rounded-xl bg-white/5" />
      </div>
      <div className="h-44 animate-pulse rounded-xl bg-white/5" />
    </div>
  );
}

function formatPoints(value: number) {
  return Number(value).toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatSignedPoints(value: number) {
  const numericValue = Number(value);
  const prefix = numericValue > 0 ? "+" : "";
  return `${prefix}${formatPoints(numericValue)}`;
}

function formatStatisticValue(value: number | string | boolean | null) {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? "Sì" : "No";
  return String(value);
}

function getPointsTone(points: number) {
  if (Number(points) > 0) return "text-green-400";
  if (Number(points) < 0) return "text-red-400";
  return "text-zinc-500";
}

function getPositionLabel(position: PlayerPosition) {
  return {
    GOALKEEPER: "Portiere",
    DEFENDER: "Difensore",
    MIDFIELDER: "Centrocampista",
    ATTACKER: "Attaccante",
    COACH: "Allenatore",
  }[position];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function StatusMessage({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#22E6C3]/10 text-[#1ED8B7]">
        {icon}
      </span>
      <p className="max-w-xs text-sm text-zinc-400">{message}</p>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 9v4M12 17h.01" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
