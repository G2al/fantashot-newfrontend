"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCountdown } from "@/hooks/use-countdown";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ApiError } from "@/lib/api";
import { subscribeToTournament, updateTournamentTeam } from "@/lib/api/tournaments";
import { formatMoney, formatPrizePool } from "@/lib/format";
import {
  buildLineupFromFormationData,
  buildRandomLineup,
  buildTeamLogoMap,
  getRequiredPositionForSlot,
  getSlotLabel,
  getStarterSlotKeys,
  isSelectablePlayer,
  translateTournamentError,
} from "@/lib/tournament-team";
import { CustomDropdown, LeagueLogo } from "@/components/lobby/shared";
import {
  BENCH_SLOT_KEYS,
  type FantaTeamFormationEntry,
  type LineupPayload,
  type PlayerPosition,
  type TournamentDetail,
  type TournamentModule,
  type TournamentPlayer,
} from "@/types/tournament";

export function TeamBuilder({
  tournament,
  mode,
  viewTeam,
  onSaved,
  onPlayerInspect,
  onCancel,
}: {
  tournament: TournamentDetail;
  mode: "create" | "edit" | "view";
  /** Richiesto solo per mode="view": formazione di un'altra squadra, sola lettura. */
  viewTeam?: {
    module_id: number;
    formation_data: Record<string, FantaTeamFormationEntry>;
  };
  onSaved?: () => void | Promise<void>;
  onPlayerInspect?: (entry: FantaTeamFormationEntry) => void;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const isReadOnly = mode === "view";
  // Solo a torneo avviato ha senso distinguere chi ha giocato da chi no.
  const showPlayedState =
    isReadOnly && ["in-progress", "finished", "paid"].includes(tournament.status);
  const isMobile = !useMediaQuery("(min-width: 640px)");
  const enrollmentCountdown = useCountdown(
    tournament.status === "enrollments"
      ? tournament.enrollments_end_date
      : null
  );
  const selectablePlayers = useMemo(
    () => tournament.players.filter(isSelectablePlayer),
    [tournament.players]
  );
  const teamLogoById = useMemo(
    () => buildTeamLogoMap(tournament.fixtures),
    [tournament.fixtures]
  );
  const existingTeam = isReadOnly ? viewTeam : tournament.user_fanta_team;
  const savedPlayersById = useMemo(() => {
    const players = new Map<number, TournamentPlayer>();

    Object.entries(existingTeam?.formation_data ?? {}).forEach(([slot, entry]) => {
      players.set(entry.id, {
        id: entry.id,
        name: entry.name,
        display_name: entry.name,
        position: getRequiredPositionForSlot(slot),
        image_path: entry.avatar ?? "",
        teams: [],
      });
    });

    return players;
  }, [existingTeam]);
  const [moduleId, setModuleId] = useState<number>(
    existingTeam?.module_id ?? tournament.modules[0]?.id ?? 0
  );
  const selectedModule =
    tournament.modules.find((item) => item.id === moduleId) ??
    tournament.modules[0];
  const [lineup, setLineup] = useState<LineupPayload["lineup"]>(() =>
    mode !== "create" && existingTeam
      ? buildLineupFromFormationData(existingTeam.formation_data)
      : {}
  );
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [actionSheetSlot, setActionSheetSlot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3500);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  if (!selectedModule) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-950/30 p-4 text-sm text-red-200">
        Nessun modulo disponibile per questo torneo.
      </div>
    );
  }

  const starterSlotKeys = getStarterSlotKeys(selectedModule);
  const allSlotKeys = [...starterSlotKeys, ...BENCH_SLOT_KEYS];
  const assignedPlayerIds = new Set(
    Object.values(lineup).map((entry) => entry.player_id)
  );
  const missingSlots = allSlotKeys.filter((slot) => !lineup[slot]);
  const completedStarterSlots = starterSlotKeys.filter((slot) => lineup[slot]).length;
  const captainCount = Object.values(lineup).filter(
    (entry) => entry.is_captain
  ).length;
  const isComplete = missingSlots.length === 0 && captainCount === 1;
  const hasAnyPlayer = Object.keys(lineup).length > 0;

  function findPlayer(playerId: number | undefined) {
    if (!playerId) return null;
    return (
      savedPlayersById.get(playerId) ??
      tournament.players.find((player) => player.id === playerId) ??
      null
    );
  }

  function handleModuleChange(nextModuleId: number) {
    setModuleId(nextModuleId);
    setError(null);
    setSuccessMessage(null);
    setLineup((current) => {
      const next: LineupPayload["lineup"] = {};
      BENCH_SLOT_KEYS.forEach((key) => {
        if (current[key]) next[key] = current[key];
      });
      return next;
    });
  }

  function handleAssignPlayer(slotKey: string, player: TournamentPlayer) {
    setSuccessMessage(null);
    setLineup((current) => ({
      ...current,
      [slotKey]: {
        player_id: player.id,
        is_captain: current[slotKey]?.is_captain ?? false,
      },
    }));
    setActiveSlot(null);
  }

  function handleRemovePlayer(slotKey: string) {
    setSuccessMessage(null);
    setLineup((current) => {
      const next = { ...current };
      delete next[slotKey];
      return next;
    });
  }

  function handleToggleCaptain(slotKey: string) {
    setSuccessMessage(null);
    setLineup((current) => {
      const next: LineupPayload["lineup"] = {};
      Object.entries(current).forEach(([key, entry]) => {
        next[key] = { ...entry, is_captain: key === slotKey && !entry.is_captain };
      });
      return next;
    });
  }

  function handleRandomize() {
    setLineup(buildRandomLineup(selectedModule, selectablePlayers));
    setError(null);
    setSuccessMessage(null);
  }

  function handleClear() {
    setLineup({});
    setError(null);
    setSuccessMessage(null);
  }

  /**
   * Su mobile, toccare un giocatore GIA' assegnato apre un menu contestuale
   * (sostituisci/capitano/rimuovi) invece del picker diretto, per non dover
   * mostrare stella e X sempre visibili sopra ogni slot (troppo rumore su
   * schermi stretti). Su desktop, o su uno slot vuoto, si apre subito il picker.
   */
  function handleAvatarTap(slotKey: string, hasPlayer: boolean) {
    if (isReadOnly) {
      const formationEntry = existingTeam?.formation_data[slotKey];
      if (hasPlayer && formationEntry) onPlayerInspect?.(formationEntry);
      return;
    }

    if (isMobile && hasPlayer && !isReadOnly) {
      setActionSheetSlot(slotKey);
    } else {
      setActiveSlot(slotKey);
    }
  }

  function handlePickerRoleChange(position: PlayerPosition) {
    const matchingSlots = allSlotKeys.filter(
      (slotKey) => getRequiredPositionForSlot(slotKey) === position
    );
    const targetSlot =
      matchingSlots.find((slotKey) => !lineup[slotKey]) ?? matchingSlots[0];

    if (targetSlot) {
      setActiveSlot(targetSlot);
    }
  }

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    setSuccessMessage(null);

    if (!isComplete) {
      setError(
        missingSlots.length
          ? "Completa tutti gli slot (titolari e panchina) prima di salvare."
          : "Scegli esattamente un capitano prima di salvare."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: LineupPayload = {
        module_id: selectedModule.id,
        lineup,
      };

      if (mode === "create") {
        await subscribeToTournament(tournament.id, payload, token);
      } else {
        await updateTournamentTeam(tournament.id, payload, token);
      }

      if (onSaved) await onSaved();
      setSuccessMessage("Formazione salvata con successo.");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? translateTournamentError(requestError.message)
          : "Salvataggio non riuscito. Riprova."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[#1E3448] bg-[linear-gradient(145deg,#0F1E2E_0%,#0A1420_58%,#06111B_100%)] shadow-[0_26px_80px_rgba(0,0,0,0.45)] sm:border-[#22E6C3]/30 ${isReadOnly ? "" : "pb-24 sm:pb-0"}`}>
      <div className="hidden flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/15 px-4 py-4 sm:flex sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#22E6C3]/12 text-[#22E6C3]">
            <FormationIcon />
          </span>
          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-white">
              {mode === "create"
                ? "Crea formazione"
                : mode === "edit"
                  ? "Modifica formazione"
                  : "Formazione"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              {isReadOnly
                ? "Sola lettura"
                : "Tocca uno slot per scegliere il giocatore"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isReadOnly ? (
            <span className="text-xs font-bold text-zinc-300">
              {selectedModule.name}
            </span>
          ) : (
            <>
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Modulo
              </span>
              <ModuleSelect
                modules={tournament.modules}
                value={moduleId}
                onChange={handleModuleChange}
                disabled={isSubmitting}
              />
            </>
          )}
          {isReadOnly ? null : (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              aria-label="Chiudi"
              title="Chiudi"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-300 transition hover:border-[#22E6C3]/40 hover:bg-[#22E6C3]/10 hover:text-[#3AF5D4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <div className="flex h-11 items-center justify-between gap-3 border-b border-[#1E3448] bg-[#0A1420] px-3 sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${enrollmentCountdown ? "bg-[#22E6C3] animate-pulse" : "bg-zinc-500"}`} />
          <span className="text-[10px] font-black uppercase tracking-wide text-zinc-400">
            {enrollmentCountdown ? "Chiude tra" : getTournamentStatusLabel(tournament.status)}
          </span>
          {enrollmentCountdown ? (
            <span className="font-mono text-xs font-black tabular-nums text-white">
              {enrollmentCountdown}
            </span>
          ) : null}
        </div>
        {isReadOnly ? null : (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Chiudi formazione"
            title="Chiudi"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/15 text-zinc-300 disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className={isReadOnly ? "" : "grid xl:grid-cols-[minmax(0,1fr)_310px]"}>
        <div className="min-w-0 xl:border-r xl:border-[#22E6C3]/20">
          <div className={`relative mx-auto ${isReadOnly ? "aspect-[5/8]" : "aspect-[3/4]"} w-full max-w-[1120px] sm:aspect-[4/3] xl:-mt-12`}>
            <PitchBackground />

            <div className="absolute left-1/2 top-2 z-30 w-28 -translate-x-1/2 sm:hidden">
              {isReadOnly ? (
                <span className="flex h-9 items-center justify-center rounded-lg border border-[#1E3448] bg-[#0F1E2E] px-3 text-xs font-black text-white shadow-lg">
                  {selectedModule.name}
                </span>
              ) : (
                <ModuleSelect
                  modules={tournament.modules}
                  value={moduleId}
                  onChange={handleModuleChange}
                  disabled={isSubmitting}
                  compact
                />
              )}
            </div>

            {starterSlotKeys.map((slotKey) => {
              const position = selectedModule.schema[slotKey];
              const assignment = lineup[slotKey];
              const player = findPlayer(assignment?.player_id);
              const formationEntry = existingTeam?.formation_data[slotKey];

              return (
                <PitchSlot
                  key={slotKey}
                  slotKey={slotKey}
                  x={position?.x ?? 50}
                  y={position?.y ?? 50}
                  player={player}
                  teamLogoById={teamLogoById}
                  isCaptain={Boolean(assignment?.is_captain)}
                  points={playerTotalPoints(formationEntry)}
                  bonusPoints={formationEntry?.bonus_points}
                  didNotPlay={showPlayedState && !entryCountsForPoints(formationEntry)}
                  substitution={showPlayedState ? (formationEntry?.substitution ?? null) : null}
                  readOnly={isReadOnly}
                  isInspectable={Boolean(isReadOnly && player && onPlayerInspect)}
                  onOpenPicker={() => handleAvatarTap(slotKey, Boolean(player))}
                  onToggleCaptain={() => handleToggleCaptain(slotKey)}
                  onRemove={() => handleRemovePlayer(slotKey)}
                />
              );
            })}
          </div>

          <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-black/25 p-3 sm:mx-5 sm:p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                <span className="text-[#22E6C3]"><BenchIcon /></span>
                Panchina
              </p>
              <p className="text-[10px] text-zinc-500">{BENCH_SLOT_KEYS.length} slot per le riserve</p>
            </div>
            <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-2 pb-1 pt-3 sm:justify-between sm:snap-none">
              {BENCH_SLOT_KEYS.map((slotKey) => {
                const assignment = lineup[slotKey];
                const player = findPlayer(assignment?.player_id);
                const formationEntry = existingTeam?.formation_data[slotKey];

                return (
                  <div key={slotKey} className="snap-start">
                    <PlayerCard
                      slotKey={slotKey}
                      player={player}
                      teamLogoById={teamLogoById}
                      isCaptain={Boolean(assignment?.is_captain)}
                      points={playerTotalPoints(formationEntry)}
                  bonusPoints={formationEntry?.bonus_points}
                      didNotPlay={showPlayedState && !entryCountsForPoints(formationEntry)}
                  substitution={showPlayedState ? (formationEntry?.substitution ?? null) : null}
                      size="bench"
                      readOnly={isReadOnly}
                      isInspectable={Boolean(isReadOnly && player && onPlayerInspect)}
                      onOpenPicker={() => handleAvatarTap(slotKey, Boolean(player))}
                      onToggleCaptain={() => handleToggleCaptain(slotKey)}
                      onRemove={() => handleRemovePlayer(slotKey)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {isReadOnly ? null : (
          <FormationSummary
            tournament={tournament}
            completed={completedStarterSlots}
            total={starterSlotKeys.length}
            mode={mode}
            isComplete={isComplete}
            missingSlots={missingSlots.length}
            captainCount={captainCount}
            isSubmitting={isSubmitting}
            error={error}
            successMessage={successMessage}
            hasAnyPlayer={hasAnyPlayer}
            onClear={handleClear}
            onRandomize={handleRandomize}
            onSubmit={() => void handleSubmit()}
          />
        )}
      </div>

      {!isReadOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#1E3448] bg-[#06111B]/95 px-3 pt-2 shadow-[0_-14px_40px_rgba(0,0,0,0.5)] backdrop-blur-md sm:hidden">
          {error ? (
            <p className="mx-auto mb-2 max-w-md truncate rounded-md border border-red-500/20 bg-red-950/90 px-3 py-1.5 text-center text-[10px] font-semibold text-red-200">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p
              role="status"
              className="mx-auto mb-2 max-w-md rounded-md border border-green-500/25 bg-green-950/90 px-3 py-1.5 text-center text-[10px] font-semibold text-green-200"
            >
              {successMessage}
            </p>
          ) : null}
          <div className="mx-auto grid max-w-md grid-cols-[44px_minmax(84px,0.8fr)_minmax(0,1.4fr)] gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={handleRandomize}
              disabled={isSubmitting}
              aria-label="Formazione casuale"
              title="Formazione casuale"
              className="grid h-12 place-items-center rounded-lg border border-[#1E3448] bg-[#0F1E2E] text-zinc-200 disabled:opacity-50"
            >
              <DiceIcon />
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={isSubmitting || !hasAnyPlayer}
              className="flex h-12 items-center justify-center gap-1.5 rounded-lg border border-[#1E3448] bg-[#0F1E2E] px-3 text-xs font-black uppercase text-zinc-200 disabled:opacity-40"
            >
              <TrashIcon />
              Svuota
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-[#22E6C3] px-3 text-xs font-black uppercase text-[#06111B] shadow-[0_8px_24px_rgba(34,230,195,0.28)] disabled:opacity-60"
            >
              <SaveIcon />
              <span className="truncate">
                {isSubmitting
                  ? "Salvataggio..."
                  : mode === "create"
                    ? "Iscriviti e salva"
                    : "Salva"}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {activeSlot ? (
        <PlayerPickerModal
          slotKey={activeSlot}
          players={selectablePlayers}
          teamLogoById={teamLogoById}
          assignedPlayerIds={assignedPlayerIds}
          currentPlayerId={lineup[activeSlot]?.player_id}
          availablePositions={Array.from(
            new Set(allSlotKeys.map(getRequiredPositionForSlot))
          )}
          onRoleChange={handlePickerRoleChange}
          onSelect={(player) => handleAssignPlayer(activeSlot, player)}
          onClose={() => setActiveSlot(null)}
        />
      ) : null}

      {actionSheetSlot ? (
        <PlayerActionSheet
          slotKey={actionSheetSlot}
          player={findPlayer(lineup[actionSheetSlot]?.player_id)}
          isCaptain={Boolean(lineup[actionSheetSlot]?.is_captain)}
          onSubstitute={() => {
            setActionSheetSlot(null);
            setActiveSlot(actionSheetSlot);
          }}
          onToggleCaptain={() => {
            handleToggleCaptain(actionSheetSlot);
            setActionSheetSlot(null);
          }}
          onRemove={() => {
            handleRemovePlayer(actionSheetSlot);
            setActionSheetSlot(null);
          }}
          onClose={() => setActionSheetSlot(null)}
        />
      ) : null}

      {isSubmitting ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[90] flex min-h-[100dvh] items-center justify-center bg-[#06111B]/88 px-6 text-center backdrop-blur-sm sm:absolute sm:z-[70] sm:min-h-0"
        >
          <div>
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#22E6C3]" />
            <p className="mt-4 text-sm font-black uppercase tracking-wide text-white">
              {mode === "create" ? "Iscrizione in corso" : "Salvataggio formazione"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">Attendi qualche secondo...</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ModuleSelect({
  modules,
  value,
  onChange,
  disabled,
  compact = false,
}: {
  modules: TournamentModule[];
  value: number;
  onChange: (moduleId: number) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  const options = modules.map((module) => {
    return {
      label: module.name,
      value: String(module.id),
    };
  });
  const selected = options.find((option) => option.value === String(value));

  return (
    <CustomDropdown
      ariaLabel="Modulo"
      buttonClassName={compact ? "h-9 min-w-28 px-3 shadow-lg" : "h-11 min-w-36 px-4"}
      buttonContent={
        <span className={`block min-w-0 flex-1 truncate font-bold text-zinc-100 ${compact ? "text-center text-xs" : "text-left text-sm"}`}>
          {selected?.label}
        </span>
      }
      options={options}
      value={String(value)}
      onChange={(next) => onChange(Number(next))}
      disabled={disabled}
    />
  );
}

function FormationSummary({
  tournament,
  completed,
  total,
  mode,
  isComplete,
  missingSlots,
  captainCount,
  isSubmitting,
  error,
  successMessage,
  hasAnyPlayer,
  onClear,
  onRandomize,
  onSubmit,
}: {
  tournament: TournamentDetail;
  completed: number;
  total: number;
  mode: "create" | "edit" | "view";
  isComplete: boolean;
  missingSlots: number;
  captainCount: number;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  hasAnyPlayer: boolean;
  onClear: () => void;
  onRandomize: () => void;
  onSubmit: () => void;
}) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const competition =
    tournament.leagues.length > 1
      ? `${tournament.leagues.length} campionati`
      : tournament.leagues[0]?.name ?? "Non assegnata";
  const stageLabel = missingSlots
    ? `${missingSlots} titolari da inserire`
    : captainCount === 1
      ? "Formazione pronta"
      : "Squadra completa: scegli il capitano";

  return (
    <aside className="border-t border-[#1E3448] bg-black/15 p-4 sm:border-[#22E6C3]/20 sm:p-5 xl:border-t-0">
      <div className="rounded-xl border border-[#1E3448] bg-[linear-gradient(145deg,rgba(15,30,46,0.9),rgba(6,17,27,0.96))] p-4 sm:border-[#22E6C3]/25">
        <section>
        <div className="sm:hidden">
          <div className="flex items-center gap-2 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${isComplete ? "bg-green-500" : "bg-amber-400"}`} />
            <p className="min-w-0 flex-1 truncate font-semibold text-zinc-300">{stageLabel}</p>
            <span className="shrink-0 font-black text-white">{completed}/{total}</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#18C6A7] to-[#1ED8B7] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2 text-[#22E6C3]">
            <FormationIcon />
            <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
              Stato formazione
            </h3>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#18C6A7] to-[#1ED8B7] transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-black text-white">{completed}/{total}</span>
          </div>
          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs">
            <span className={`h-2 w-2 shrink-0 rounded-full ${isComplete ? "bg-[#1ED8B7]" : "bg-amber-400"}`} />
            <p className="font-semibold text-zinc-300">{stageLabel}</p>
          </div>
        </div>
        </section>

        <section className="mt-5 border-t border-[#1E3448] pt-5">
        <details className="group sm:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-[#22E6C3]">
              <TrophyIcon />
              <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
                Dettagli torneo
              </h3>
            </span>
            <span className="text-zinc-500 transition group-open:rotate-180">
              <ChevronDownIcon />
            </span>
          </summary>
          <dl className="mt-4 space-y-2.5 text-xs">
            <TournamentDetailRows tournament={tournament} competition={competition} />
          </dl>
        </details>

        <div className="hidden sm:block">
          <div className="flex items-center gap-2 text-[#22E6C3]">
            <TrophyIcon />
            <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
              Dettagli torneo
            </h3>
          </div>
          <dl className="mt-4 space-y-2.5 text-xs">
            <TournamentDetailRows tournament={tournament} competition={competition} />
          </dl>
        </div>
        </section>

        <div className="mt-5 hidden rounded-xl border border-[#22E6C3]/25 bg-[#123A3B]/20 p-4 sm:block">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-500/20 bg-red-950/60 px-3 py-2 text-xs text-red-200">
              {error}
            </p>
          ) : null}
          {successMessage ? (
            <p
              role="status"
              className="mb-3 rounded-lg border border-green-500/25 bg-green-950/60 px-3 py-2 text-xs font-semibold text-green-200"
            >
              {successMessage}
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] px-3 text-[13px] font-black uppercase text-[#06111B] shadow-[0_10px_30px_rgba(34,230,195,0.35)] transition hover:from-[#1ED8B7] hover:to-[#22E6C3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <SaveIcon />
              {isSubmitting
                ? mode === "create"
                  ? "Iscrizione in corso..."
                  : "Salvataggio..."
                : mode === "create"
                  ? "Iscriviti e salva"
                  : "Salva formazione"}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClear}
                disabled={isSubmitting || !hasAnyPlayer}
                aria-label="Svuota formazione"
                title="Svuota formazione"
                className="flex h-11 items-center justify-center rounded-lg border border-white/15 text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <TrashIcon />
              </button>
              <button
                type="button"
                onClick={onRandomize}
                disabled={isSubmitting}
                aria-label="Formazione casuale"
                title="Formazione casuale"
                className="flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/[0.03] text-zinc-200 transition hover:border-[#22E6C3]/40 hover:bg-[#22E6C3]/5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <DiceIcon />
              </button>
            </div>
          </div>

          <p className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-zinc-500">
            <span className="text-[#1ED8B7]">ϟ</span>
            Potrai modificare la formazione finché le iscrizioni sono aperte.
          </p>
        </div>
      </div>
    </aside>
  );
}

function TournamentDetailRows({
  tournament,
  competition,
}: {
  tournament: TournamentDetail;
  competition: string;
}) {
  return (
    <>
      <SummaryRow label="Nome torneo" value={tournament.title} />
      <div className="flex items-center justify-between gap-3">
        <dt className="text-zinc-400">Competizione</dt>
        <dd className="flex min-w-0 items-center gap-2 font-bold text-zinc-100">
          {tournament.leagues[0] ? (
            <LeagueLogo logoUrl={tournament.leagues[0].logo} label={tournament.leagues[0].name} />
          ) : null}
          <span className="max-w-32 truncate">{competition}</span>
        </dd>
      </div>
      <SummaryRow label="Montepremi" value={formatPrizePool(tournament.prize_pool)} />
      <SummaryRow label="Quota di iscrizione" value={formatMoney(tournament.buy_in)} />
      <SummaryRow label="Partecipanti" value={`${tournament.enrolled_users_count}/${tournament.max_participants}`} />
      <div className="flex items-center justify-between gap-3">
        <dt className="text-zinc-400">Stato</dt>
        <dd className="flex items-center gap-2 text-right font-bold text-zinc-100">
          <span className={`h-2.5 w-2.5 rounded-full ${tournament.status === "enrollments" ? "bg-[#22E6C3]" : "bg-zinc-500"}`} />
          {getTournamentStatusLabel(tournament.status)}
        </dd>
      </div>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-2.5 last:border-0">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="max-w-40 truncate text-right font-bold text-zinc-100">{value}</dd>
    </div>
  );
}

function getTournamentStatusLabel(status: TournamentDetail["status"]) {
  return {
    draft: "Bozza",
    ready: "Pronto",
    enrollments: "Iscrizioni aperte",
    "waiting-for-start": "In attesa",
    "in-progress": "In corso",
    finished: "Concluso",
    paid: "Premi pagati",
    cancelled: "Annullato",
  }[status];
}

/** Il numero da mostrare e' sempre total_points; points e' solo la parte base. */
function playerTotalPoints(entry?: FantaTeamFormationEntry): number | undefined {
  if (!entry) return undefined;
  return typeof entry.total_points === "number" ? entry.total_points : entry.points;
}

/** Fonte di verita' e' il backend; il fallback sui minuti serve solo se il campo manca. */
function entryCountsForPoints(entry?: FantaTeamFormationEntry): boolean {
  if (!entry) return true;
  if (typeof entry.counts_for_points === "boolean") return entry.counts_for_points;
  return (entry.minutes_played ?? 0) > 0;
}

/** Formatta i punti del giocatore senza zeri decimali inutili. */
function formatPlayerPoints(points: number): string {
  if (!Number.isFinite(points)) return "0";

  return new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(points);
}

/** Card giocatore condivisa tra campo e panchina, solo taglia diversa. */
function PlayerCard({
  slotKey,
  player,
  teamLogoById,
  isCaptain,
  points,
  bonusPoints,
  didNotPlay = false,
  substitution = null,
  size,
  readOnly = false,
  isInspectable = false,
  onOpenPicker,
  onToggleCaptain,
  onRemove,
}: {
  slotKey: string;
  player: TournamentPlayer | null;
  teamLogoById: Map<number, string>;
  isCaptain: boolean;
  points?: number;
  bonusPoints?: number;
  didNotPlay?: boolean;
  substitution?: FantaTeamFormationEntry["substitution"];
  size: "pitch" | "bench";
  readOnly?: boolean;
  isInspectable?: boolean;
  onOpenPicker: () => void;
  onToggleCaptain: () => void;
  onRemove: () => void;
}) {
  const avatarSize =
    size === "pitch"
      ? "h-10 w-10 sm:h-12 sm:w-12 2xl:h-14 2xl:w-14"
      : "h-10 w-10 sm:h-12 sm:w-12";
  const teamLogo = player?.teams[0] ? teamLogoById.get(player.teams[0].id) : null;
  const roleAsset = getRoleAsset(slotKey);

  return (
    <div className={`flex flex-col items-center gap-1 ${size === "bench" ? "w-[72px] shrink-0" : "w-14 sm:w-20"}`}>
      <div className="relative">
        <button
          type="button"
          onClick={onOpenPicker}
          disabled={readOnly && !isInspectable}
          aria-label={
            player && isInspectable
              ? `Visualizza statistiche di ${player.display_name}`
              : player
                ? player.display_name
                : getSlotLabel(slotKey)
          }
          className={`relative flex items-center justify-center overflow-hidden rounded-full text-[10px] font-black shadow-lg transition ${avatarSize} ${
            player
              ? `border-2 bg-[#0F1E2E] text-white ring-1 ring-[#06111B]/70 sm:ring-0 ${getMobileFilledRingClass(slotKey, didNotPlay)} ${
                  isCaptain
                    ? "sm:border-amber-400"
                    : didNotPlay
                      ? "sm:border-zinc-600"
                      : "sm:border-[#22E6C3]"
                }`
              : `${getMobileEmptySlotClass(slotKey)} hover:scale-105 sm:border-0 sm:bg-transparent sm:text-white sm:shadow-lg`
          } ${readOnly && !isInspectable ? "cursor-default disabled:opacity-100 hover:scale-100" : ""} ${isInspectable ? "cursor-pointer hover:scale-105 hover:border-[#3AF5D4]" : ""}`}
        >
          {player ? (
            player.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.image_path}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover ${didNotPlay ? "opacity-40 grayscale" : ""}`}
              />
            ) : (
              getInitials(player.display_name)
            )
          ) : (
            <>
              <Image
                src={roleAsset}
                alt=""
                width={128}
                height={128}
                aria-hidden="true"
                className="absolute inset-0 hidden h-full w-full object-contain sm:block"
              />
              <span className="absolute inset-0 z-10 grid place-items-center text-white sm:hidden">
                <PlusIcon />
              </span>
              <span className="absolute bottom-[10%] left-1/2 z-10 hidden -translate-x-1/2 scale-75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:block">
                <PlusIcon />
              </span>
            </>
          )}
        </button>

        {player ? (
          <Image
            src={roleAsset}
            alt={getSlotLabel(slotKey)}
            width={32}
            height={32}
            className="absolute -left-1.5 -top-1.5 z-20 hidden h-5 w-5 drop-shadow-lg sm:-left-2 sm:-top-2 sm:block sm:h-7 sm:w-7"
          />
        ) : null}

        {player && teamLogo ? (
          <span className="absolute -bottom-0.5 -right-0.5 hidden h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-black/40 bg-[#06111B] shadow sm:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teamLogo} alt="" className="h-full w-full object-contain p-0.5" />
          </span>
        ) : null}

        {player ? (
          <span
            aria-hidden="true"
            className={`absolute -bottom-1 -left-1 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-[#06111B] text-[8px] font-black shadow sm:hidden ${getMobileRoleBadgeClass(slotKey)}`}
          >
            {getRoleShortLabel(slotKey)}
          </span>
        ) : null}

        {player && isCaptain ? (
          <span
            title="Capitano"
            className="absolute -right-1 -top-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-black shadow sm:-right-1.5 sm:-top-1.5 sm:h-5 sm:w-5 sm:text-[9px] sm:font-black"
          >
            <span className="sm:hidden">
              <StarIcon />
            </span>
            <span className="hidden sm:inline">C</span>
          </span>
        ) : null}

        {player && substitution ? (
          <span
            title={substitution.status === "in" ? "Entra al posto di un titolare" : "Sostituito da una riserva"}
            aria-label={substitution.status === "in" ? "Entra" : "Esce"}
            className={`absolute -left-1 -top-1 z-20 grid sm:-bottom-1 sm:top-auto h-4 w-4 place-items-center rounded-full border border-[#06111B] shadow sm:h-5 sm:w-5 ${
              substitution.status === "in" ? "bg-green-500 text-[#06111B]" : "bg-red-500 text-white"
            }`}
          >
            <SubstitutionArrowIcon direction={substitution.status === "in" ? "up" : "down"} />
          </span>
        ) : null}
      </div>

      {player && !readOnly ? (
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={onToggleCaptain}
            aria-pressed={isCaptain}
            title="Capitano (+20% punti)"
            className={`grid h-5 w-5 place-items-center rounded-full transition ${
              isCaptain
                ? "bg-amber-400 text-black"
                : "bg-white/10 text-white/50 hover:bg-amber-400/30 hover:text-amber-200"
            }`}
          >
            <StarIcon />
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Rimuovi"
            className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-white/50 hover:bg-[#22E6C3]/20 hover:text-[#3AF5D4]"
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {player ? (
        <>
          <span className="max-w-14 truncate rounded-full bg-black/80 px-1.5 py-0.5 text-center text-[8px] font-bold leading-tight text-white drop-shadow sm:max-w-[88px] sm:px-2 sm:text-[10px]">
            <span className="sm:hidden">{getSurname(player.display_name)}</span>
            <span className="hidden sm:inline">{player.display_name}</span>
          </span>
          {readOnly && didNotPlay ? (
            <span className="rounded-full border border-zinc-600 bg-zinc-800/90 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-wide text-zinc-400 shadow">
              {size === "bench" ? "Riserva" : "Assente"}
            </span>
          ) : readOnly && isCaptain && typeof points === "number" ? (
            <span className="flex flex-col items-center gap-0.5">
              <span className="rounded-full border border-amber-400/70 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black leading-none text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] sm:px-2.5 sm:py-1 sm:text-sm">
                {formatPlayerPoints(points)} pt
              </span>
              {bonusPoints ? (
                <span className="text-[8px] font-black leading-none text-amber-400/90 sm:text-[10px]">
                  +{formatPlayerPoints(bonusPoints)} bonus
                </span>
              ) : null}
            </span>
          ) : readOnly && typeof points === "number" ? (
            <span className="rounded-full border border-[#22E6C3]/35 bg-[#123A3B]/90 px-1.5 py-0.5 text-[8px] font-black leading-none text-[#3AF5D4] shadow sm:px-2 sm:py-1 sm:text-[10px]">
              {formatPlayerPoints(points)} pt
            </span>
          ) : null}
        </>
      ) : (
        <>
          <span className={`flex h-5 min-w-12 items-center justify-center rounded-md px-2 text-[10px] font-black sm:hidden ${getMobileRolePillClass(slotKey)}`}>
            {getRoleShortLabel(slotKey)}
          </span>
          <span className="hidden max-w-[88px] truncate rounded-full bg-black/75 px-2 py-0.5 text-center text-[10px] font-bold leading-tight text-white sm:inline-block">
            {getSlotLabel(slotKey)}
          </span>
        </>
      )}
    </div>
  );
}

function getRoleAsset(slotKey: string) {
  const role = getRequiredPositionForSlot(slotKey);

  return {
    GOALKEEPER: "/images/roles/goalkeeper.svg",
    DEFENDER: "/images/roles/defender.svg",
    MIDFIELDER: "/images/roles/midfielder.svg",
    ATTACKER: "/images/roles/attacker.svg",
    COACH: "/images/roles/attacker.svg",
  }[role];
}

function getRoleShortLabel(slotKey: string) {
  return {
    GOALKEEPER: "P",
    DEFENDER: "D",
    MIDFIELDER: "C",
    ATTACKER: "A",
    COACH: "A",
  }[getRequiredPositionForSlot(slotKey)];
}

function getMobileRolePillClass(slotKey: string) {
  return {
    GOALKEEPER: "bg-[#F6C343] text-white",
    DEFENDER: "bg-[#3B82F6] text-white",
    MIDFIELDER: "bg-[#22C55E] text-white",
    ATTACKER: "bg-[#EF4444] text-white",
    COACH: "bg-[#EF4444] text-white",
  }[getRequiredPositionForSlot(slotKey)];
}

/** Anello del giocatore assegnato: colore del ruolo, attenuato se non ha giocato. */
function getMobileFilledRingClass(slotKey: string, dimmed: boolean) {
  const ring = {
    GOALKEEPER: ["border-[#F6C343]", "border-[#F6C343]/45"],
    DEFENDER: ["border-[#3B82F6]", "border-[#3B82F6]/45"],
    MIDFIELDER: ["border-[#22C55E]", "border-[#22C55E]/45"],
    ATTACKER: ["border-[#EF4444]", "border-[#EF4444]/45"],
    COACH: ["border-[#EF4444]", "border-[#EF4444]/45"],
  }[getRequiredPositionForSlot(slotKey)];

  return dimmed ? ring[1] : ring[0];
}

function getMobileRoleBadgeClass(slotKey: string) {
  return {
    GOALKEEPER: "bg-[#F6C343] text-[#06111B]",
    DEFENDER: "bg-[#3B82F6] text-white",
    MIDFIELDER: "bg-[#22C55E] text-[#06111B]",
    ATTACKER: "bg-[#EF4444] text-white",
    COACH: "bg-[#EF4444] text-white",
  }[getRequiredPositionForSlot(slotKey)];
}

function getMobileEmptySlotClass(slotKey: string) {
  return {
    GOALKEEPER:
      "border-2 border-[#F6C343] bg-[#0F1E2E] text-white shadow-[0_0_10px_rgba(246,195,67,0.45)]",
    DEFENDER:
      "border-2 border-[#3B82F6] bg-[#0F1E2E] text-white shadow-[0_0_10px_rgba(59,130,246,0.45)]",
    MIDFIELDER:
      "border-2 border-[#22C55E] bg-[#0F1E2E] text-white shadow-[0_0_10px_rgba(34,197,94,0.45)]",
    ATTACKER:
      "border-2 border-[#EF4444] bg-[#0F1E2E] text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]",
    COACH:
      "border-2 border-[#EF4444] bg-[#0F1E2E] text-white shadow-[0_0_10px_rgba(239,68,68,0.45)]",
  }[getRequiredPositionForSlot(slotKey)];
}

function PitchSlot({
  slotKey,
  x,
  y,
  player,
  teamLogoById,
  isCaptain,
  points,
  bonusPoints,
  didNotPlay = false,
  substitution = null,
  readOnly = false,
  isInspectable = false,
  onOpenPicker,
  onToggleCaptain,
  onRemove,
}: {
  slotKey: string;
  x: number;
  y: number;
  player: TournamentPlayer | null;
  teamLogoById: Map<number, string>;
  isCaptain: boolean;
  points?: number;
  bonusPoints?: number;
  didNotPlay?: boolean;
  substitution?: FantaTeamFormationEntry["substitution"];
  readOnly?: boolean;
  isInspectable?: boolean;
  onOpenPicker: () => void;
  onToggleCaptain: () => void;
  onRemove: () => void;
}) {
  const slotPosition = {
    "--mobile-slot-left": `${12 + x * 0.76}%`,
    "--mobile-slot-top": `${10 + y * 0.8}%`,
    "--desktop-slot-left": `${12 + x * 0.76}%`,
    "--desktop-slot-top": `${16 + y * 0.68}%`,
  } as CSSProperties;

  return (
    <div
      style={slotPosition}
      className="absolute left-[var(--mobile-slot-left)] top-[var(--mobile-slot-top)] -translate-x-1/2 -translate-y-1/2 sm:left-[var(--desktop-slot-left)] sm:top-[var(--desktop-slot-top)]"
    >
      <PlayerCard
        slotKey={slotKey}
        player={player}
        teamLogoById={teamLogoById}
        isCaptain={isCaptain}
        points={points}
        bonusPoints={bonusPoints}
        didNotPlay={didNotPlay}
        substitution={substitution}
        size="pitch"
        readOnly={readOnly}
        isInspectable={isInspectable}
        onOpenPicker={onOpenPicker}
        onToggleCaptain={onToggleCaptain}
        onRemove={onRemove}
      />
    </div>
  );
}

function PlayerPickerModal({
  slotKey,
  players,
  teamLogoById,
  assignedPlayerIds,
  currentPlayerId,
  availablePositions,
  onRoleChange,
  onSelect,
  onClose,
}: {
  slotKey: string;
  players: TournamentPlayer[];
  teamLogoById: Map<number, string>;
  assignedPlayerIds: Set<number>;
  currentPlayerId?: number;
  availablePositions: PlayerPosition[];
  onRoleChange: (position: PlayerPosition) => void;
  onSelect: (player: TournamentPlayer) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const requiredPosition = getRequiredPositionForSlot(slotKey);
  const normalizedSearch = search.trim().toLowerCase();

  const teamsForRole = useMemo(() => {
    const teams = new Map<number, { id: number; name: string }>();
    players.forEach((player) => {
      if (player.position !== requiredPosition) return;
      player.teams.forEach((team) => {
        if (!teams.has(team.id)) {
          teams.set(team.id, { id: team.id, name: team.name });
        }
      });
    });
    return Array.from(teams.values()).sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [players, requiredPosition]);

  const candidates = players.filter((player) => {
    if (player.position !== requiredPosition) return false;
    if (
      selectedTeamId !== null &&
      !player.teams.some((team) => team.id === selectedTeamId)
    ) {
      return false;
    }
    if (assignedPlayerIds.has(player.id) && player.id !== currentPlayerId) {
      return false;
    }
    if (!normalizedSearch) return true;
    return player.display_name.toLowerCase().includes(normalizedSearch);
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
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
        className="relative flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-[#0F1E2E] p-5 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:border sm:p-6 lg:max-w-3xl"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-[#3AF5D4]">
              Scegli
            </p>
            <h3 className="text-base font-black text-white">
              {getSlotLabel(slotKey)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-zinc-300"
          >
            <CloseIcon />
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca giocatore..."
          className="mt-4 h-10 w-full rounded-full border border-[#1E3448] bg-[#101D2C] px-3.5 text-xs text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[#22E6C3]/50 sm:h-9"
        />

        <div className="mt-4">
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
            Filtra per ruolo
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PLAYER_ROLE_FILTERS.filter((role) =>
              availablePositions.includes(role.value)
            ).map((role) => (
              <RoleFilterChip
                key={role.value}
                label={role.label}
                position={role.value}
                isActive={requiredPosition === role.value}
                onClick={() => {
                  setSelectedTeamId(null);
                  onRoleChange(role.value);
                }}
              />
            ))}
          </div>
        </div>

        {teamsForRole.length > 1 ? (
          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">
              Filtra per squadra
            </p>
            <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
              <TeamFilterChip
                label="Tutte"
                isActive={selectedTeamId === null}
                onClick={() => setSelectedTeamId(null)}
              />
              {teamsForRole.map((team) => (
                <TeamFilterChip
                  key={team.id}
                  label={team.name}
                  logoUrl={teamLogoById.get(team.id)}
                  isActive={selectedTeamId === team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          className="mt-4 grid min-h-0 flex-1 grid-cols-1 content-start gap-1 overflow-y-auto sm:grid-cols-2 sm:gap-2"
        >
          {candidates.length ? (
            candidates.map((player) => {
              const displayedTeam =
                player.teams.find((team) => team.id === selectedTeamId) ??
                player.teams[0];
              const teamLogo = displayedTeam
                ? teamLogoById.get(displayedTeam.id)
                : null;

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelect(player)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                    player.id === currentPlayerId
                      ? "bg-[#22E6C3]/15 text-[#E9FFFA]"
                      : "hover:bg-white/5"
                  }`}
                >
                  <span className="relative h-10 w-10 shrink-0">
                    <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white/10">
                      {player.image_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={player.image_path}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-zinc-300">
                          {getInitials(player.display_name)}
                        </span>
                      )}
                    </span>
                    {teamLogo ? (
                      <span className="absolute -bottom-1 -right-1 z-10 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-[#0F1E2E] bg-white shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={teamLogo} alt="" className="h-full w-full object-contain p-0.5" />
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-zinc-100">
                        {player.display_name}
                      </span>
                      <PlayerRoleBadge position={player.position} />
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {displayedTeam?.name ?? "Squadra sconosciuta"}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-6 text-center text-sm text-zinc-500 sm:col-span-2">
              Nessun giocatore trovato per questo ruolo.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerActionSheet({
  slotKey,
  player,
  isCaptain,
  onSubstitute,
  onToggleCaptain,
  onRemove,
  onClose,
}: {
  slotKey: string;
  player: TournamentPlayer | null;
  isCaptain: boolean;
  onSubstitute: () => void;
  onToggleCaptain: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[85] flex items-end sm:hidden">
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />

      <div className="relative w-full rounded-t-2xl border-t border-white/10 bg-[#0F1E2E] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-white/10">
            {player?.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.image_path} alt="" className="h-full w-full object-cover" />
            ) : player ? (
              <span className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-300">
                {getInitials(player.display_name)}
              </span>
            ) : null}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">
              {player?.display_name ?? getSlotLabel(slotKey)}
            </p>
            <p className="text-xs text-zinc-500">{getSlotLabel(slotKey)}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onSubstitute}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-zinc-100 transition hover:bg-white/5"
          >
            <span className="text-[#22E6C3]"><SwapIcon /></span>
            Sostituisci
          </button>
          <button
            type="button"
            onClick={onToggleCaptain}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-zinc-100 transition hover:bg-white/5"
          >
            <span className="text-amber-400"><StarIcon /></span>
            {isCaptain ? "Togli capitano" : "Rendi capitano"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold text-red-300 transition hover:bg-red-500/10"
          >
            <CloseIcon />
            Rimuovi dalla formazione
          </button>
        </div>
      </div>
    </div>
  );
}

function SwapIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4v13M7 17l-3-3M7 17l3-3M17 20V7M17 7l3 3M17 7l-3 3" />
    </svg>
  );
}

function TeamFilterChip({
  label,
  logoUrl,
  isActive,
  onClick,
}: {
  label: string;
  logoUrl?: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition sm:min-h-9 ${
        isActive
          ? "border-[#22E6C3] bg-[#123A3B] text-[#22E6C3]"
          : "border-[#1E3448] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-4 w-4 shrink-0 object-contain" />
      ) : null}
      {label}
    </button>
  );
}

const PLAYER_ROLE_FILTERS: Array<{
  value: PlayerPosition;
  label: string;
  asset: string;
}> = [
  { value: "GOALKEEPER", label: "Portieri", asset: "/images/roles/goalkeeper.svg" },
  { value: "DEFENDER", label: "Difensori", asset: "/images/roles/defender.svg" },
  { value: "MIDFIELDER", label: "Centrocampisti", asset: "/images/roles/midfielder.svg" },
  { value: "ATTACKER", label: "Attaccanti", asset: "/images/roles/attacker.svg" },
];

const PLAYER_ROLE_STYLES: Record<PlayerPosition, string> = {
  GOALKEEPER: "border-[#F6C343]/35 bg-[#F6C343]/10 text-[#F6C343]",
  DEFENDER: "border-[#3B82F6]/35 bg-[#3B82F6]/10 text-[#60A5FA]",
  MIDFIELDER: "border-[#22C55E]/35 bg-[#22C55E]/10 text-[#4ADE80]",
  ATTACKER: "border-[#EF4444]/35 bg-[#EF4444]/10 text-[#F87171]",
  COACH: "border-white/15 bg-white/5 text-zinc-400",
};

function RoleFilterChip({
  label,
  position,
  isActive,
  onClick,
}: {
  label: string;
  position: PlayerPosition;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      className={`grid min-h-12 w-full place-items-center rounded-xl border transition sm:min-h-14 ${
        isActive
          ? PLAYER_ROLE_STYLES[position]
          : "border-[#1E3448] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
    >
      <Image
        src={PLAYER_ROLE_FILTERS.find((role) => role.value === position)?.asset ?? "/images/roles/attacker.svg"}
        alt=""
        width={128}
        height={128}
        aria-hidden="true"
        className={`h-8 w-8 object-contain transition sm:h-9 sm:w-9 ${isActive ? "scale-105" : "opacity-65 grayscale-[35%]"}`}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}

function PlayerRoleBadge({ position }: { position: string }) {
  const role = PLAYER_ROLE_FILTERS.find((item) => item.value === position);

  return (
    <span
      title={role?.label ?? "Ruolo"}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center"
    >
      <Image
        src={role?.asset ?? "/images/roles/attacker.svg"}
        alt=""
        width={128}
        height={128}
        aria-hidden="true"
        className="h-7 w-7 object-contain"
      />
      <span className="sr-only">{role?.label ?? "Ruolo"}</span>
    </span>
  );
}

function PitchBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(34,230,195,0.18),transparent_68%)]">
      <div className="absolute inset-x-[8%] bottom-[7%] top-[13%] bg-[radial-gradient(ellipse_at_center,rgba(34,230,195,0.2),transparent_65%)] blur-2xl" />
      {/* eslint-disable-next-line @next/next/no-img-element -- asset sostituito spesso durante lo sviluppo: la cache dell'ottimizzatore next/image intrappolava versioni vecchie */}
      <img
        src="/images/tournament-pitch.png"
        alt="Campo da calcio Fantashot"
        className="absolute inset-0 h-full w-full object-fill sm:object-contain"
      />
    </div>
  );
}

/** Su mobile l'etichetta mostra solo il cognome: piu' leggibile nello spazio stretto tra un ruolo e l'altro. */
function getSurname(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
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

function DiceIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="16" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="8" cy="16" r="1" fill="currentColor" />
      <circle cx="16" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function FormationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="10" r="2.5" />
      <circle cx="19" cy="10" r="2.5" />
      <path d="M7 21v-3a5 5 0 0 1 10 0v3M1.5 20v-2a3.5 3.5 0 0 1 5-3.2M22.5 20v-2a3.5 3.5 0 0 0-5-3.2" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 2 2 3 3 0 0 1-3 3h-1M7 5H5a2 2 0 0 0-2 2 3 3 0 0 0 3 3h1" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 3h12l2 2v16H5V3Z" />
      <path d="M8 3v6h8V3M8 21v-7h8v7" />
    </svg>
  );
}

function BenchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19V9M20 19V9M4 13h16" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2.5l2.9 6.1 6.6.7-5 4.6 1.4 6.6-5.9-3.4-5.9 3.4 1.4-6.6-5-4.6 6.6-.7L12 2.5Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function SubstitutionArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      className="h-2.5 w-2.5 sm:h-3 sm:w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "up" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
