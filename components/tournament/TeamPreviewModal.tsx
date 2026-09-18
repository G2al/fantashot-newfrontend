"use client";

import { useEffect, useState } from "react";
import { TeamBuilder } from "@/components/tournament/TeamBuilder";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { getTournamentTeamDetails } from "@/lib/api/tournaments";
import { logFrontendError } from "@/lib/frontend-logger";
import type { TournamentDetail, TournamentTeamDetails } from "@/types/tournament";

const NOT_STARTED_MESSAGE = "Tournament has not started yet";

export function TeamPreviewModal({
  tournament,
  teamId,
  onClose,
}: {
  tournament: TournamentDetail;
  teamId: number;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const [team, setTeam] = useState<TournamentTeamDetails | null>(null);
  const [error, setError] = useState<"not-started" | "generic" | null>(null);

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
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-[#06111B] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-black/20 px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-black text-white">
              {team?.name ?? "Formazione"}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {team?.user.name ?? " "}
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

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
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
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
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
