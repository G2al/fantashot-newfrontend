"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
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
  type TournamentDetail,
  type TournamentModule,
  type TournamentPlayer,
} from "@/types/tournament";

export function TeamBuilder({
  tournament,
  mode,
  viewTeam,
  onSaved,
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
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const isReadOnly = mode === "view";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLineup((current) => {
      const next: LineupPayload["lineup"] = {};
      BENCH_SLOT_KEYS.forEach((key) => {
        if (current[key]) next[key] = current[key];
      });
      return next;
    });
  }

  function handleAssignPlayer(slotKey: string, player: TournamentPlayer) {
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
    setLineup((current) => {
      const next = { ...current };
      delete next[slotKey];
      return next;
    });
  }

  function handleToggleCaptain(slotKey: string) {
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
  }

  function handleClear() {
    setLineup({});
    setError(null);
  }

  async function handleSubmit() {
    if (!token) return;
    setError(null);

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
    <div className="relative overflow-hidden rounded-xl border border-[#22E6C3]/30 bg-[linear-gradient(145deg,#0F1E2E_0%,#0A1420_58%,#06111B_100%)] shadow-[0_26px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/15 px-4 py-4 sm:px-6">
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
        </div>
      </div>

      <div className={isReadOnly ? "" : "grid xl:grid-cols-[minmax(0,1fr)_310px]"}>
        <div className="min-w-0 xl:border-r xl:border-[#22E6C3]/20">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-[1120px] xl:-mt-12">
            <PitchBackground />

            {starterSlotKeys.map((slotKey) => {
              const position = selectedModule.schema[slotKey];
              const assignment = lineup[slotKey];
              const player = findPlayer(assignment?.player_id);

              return (
                <PitchSlot
                  key={slotKey}
                  slotKey={slotKey}
                  x={position?.x ?? 50}
                  y={position?.y ?? 50}
                  player={player}
                  teamLogoById={teamLogoById}
                  isCaptain={Boolean(assignment?.is_captain)}
                  readOnly={isReadOnly}
                  onOpenPicker={() => setActiveSlot(slotKey)}
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
            <div className="scrollbar-hide flex justify-between gap-3 overflow-x-auto pb-1">
              {BENCH_SLOT_KEYS.map((slotKey) => {
                const assignment = lineup[slotKey];
                const player = findPlayer(assignment?.player_id);

                return (
                  <PlayerCard
                    key={slotKey}
                    slotKey={slotKey}
                    player={player}
                    teamLogoById={teamLogoById}
                    isCaptain={Boolean(assignment?.is_captain)}
                    size="bench"
                    readOnly={isReadOnly}
                    onOpenPicker={() => setActiveSlot(slotKey)}
                    onToggleCaptain={() => handleToggleCaptain(slotKey)}
                    onRemove={() => handleRemovePlayer(slotKey)}
                  />
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
            hasAnyPlayer={hasAnyPlayer}
            onClear={handleClear}
            onRandomize={handleRandomize}
            onSubmit={() => void handleSubmit()}
          />
        )}
      </div>

      {activeSlot ? (
        <PlayerPickerModal
          slotKey={activeSlot}
          players={selectablePlayers}
          teamLogoById={teamLogoById}
          assignedPlayerIds={assignedPlayerIds}
          currentPlayerId={lineup[activeSlot]?.player_id}
          onSelect={(player) => handleAssignPlayer(activeSlot, player)}
          onClose={() => setActiveSlot(null)}
        />
      ) : null}

      {isSubmitting ? (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#06111B]/80 px-6 text-center backdrop-blur-sm">
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
}: {
  modules: TournamentModule[];
  value: number;
  onChange: (moduleId: number) => void;
  disabled: boolean;
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
      buttonClassName="h-11 min-w-36 px-4"
      buttonContent={
        <span className="block min-w-0 truncate text-left text-sm font-bold text-zinc-100">
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
    <aside className="border-t border-[#22E6C3]/20 bg-black/15 p-4 sm:p-5 xl:border-t-0">
      <div className="rounded-xl border border-[#22E6C3]/25 bg-[linear-gradient(145deg,rgba(15,30,46,0.9),rgba(6,17,27,0.96))] p-4">
        <section>
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
        </section>

        <section className="mt-5 border-t border-[#22E6C3]/25 pt-5">
        <div className="flex items-center gap-2 text-[#22E6C3]">
          <TrophyIcon />
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
            Dettagli torneo
          </h3>
        </div>
        <dl className="mt-4 space-y-2.5 text-xs">
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
        </dl>
        </section>

        <div className="mt-5 rounded-xl border border-[#22E6C3]/25 bg-[#123A3B]/20 p-4">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-500/20 bg-red-950/60 px-3 py-2 text-xs text-red-200">
              {error}
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

/** Card giocatore condivisa tra campo e panchina, solo taglia diversa. */
function PlayerCard({
  slotKey,
  player,
  teamLogoById,
  isCaptain,
  size,
  readOnly = false,
  onOpenPicker,
  onToggleCaptain,
  onRemove,
}: {
  slotKey: string;
  player: TournamentPlayer | null;
  teamLogoById: Map<number, string>;
  isCaptain: boolean;
  size: "pitch" | "bench";
  readOnly?: boolean;
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
    <div className={`flex flex-col items-center gap-1 ${size === "bench" ? "w-[72px] shrink-0" : "w-16 sm:w-20"}`}>
      <div className="relative">
        <button
          type="button"
          onClick={onOpenPicker}
          disabled={readOnly}
          aria-label={player ? player.display_name : getSlotLabel(slotKey)}
          className={`relative flex items-center justify-center overflow-hidden rounded-full text-[10px] font-black shadow-lg transition ${avatarSize} ${
            player
              ? isCaptain
                ? "border-2 border-amber-400 bg-[#0F1E2E] text-white"
                : "border-2 border-white/80 bg-[#0F1E2E] text-white"
              : "border-0 bg-transparent text-white hover:scale-105"
          } ${readOnly ? "cursor-default disabled:opacity-100 hover:scale-100" : ""}`}
        >
          {player ? (
            player.image_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.image_path}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
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
                className="absolute inset-0 h-full w-full object-contain"
              />
              <span className="absolute bottom-[10%] left-1/2 z-10 -translate-x-1/2 scale-75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
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
            className="absolute -left-2 -top-2 z-20 h-7 w-7 drop-shadow-lg"
          />
        ) : null}

        {player && teamLogo ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-black/40 bg-[#06111B] shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={teamLogo} alt="" className="h-full w-full object-contain p-0.5" />
          </span>
        ) : null}

        {player && isCaptain ? (
          <span className="absolute -right-1.5 -top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-black shadow">
            C
          </span>
        ) : null}
      </div>

      {player && !readOnly ? (
        <div className="flex items-center gap-1">
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

      <span
        className={`max-w-[88px] truncate rounded-full px-2 py-0.5 text-center text-[9px] font-bold leading-tight sm:text-[10px] ${
          player
            ? "bg-black/80 text-white drop-shadow"
            : size === "pitch"
              ? "bg-black/75 text-white"
              : "text-white/70"
        }`}
      >
        {player?.display_name ?? getSlotLabel(slotKey)}
      </span>
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

function PitchSlot({
  slotKey,
  x,
  y,
  player,
  teamLogoById,
  isCaptain,
  readOnly = false,
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
  readOnly?: boolean;
  onOpenPicker: () => void;
  onToggleCaptain: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      style={{ left: `${12 + x * 0.76}%`, top: `${16 + y * 0.68}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      <PlayerCard
        slotKey={slotKey}
        player={player}
        teamLogoById={teamLogoById}
        isCaptain={isCaptain}
        size="pitch"
        readOnly={readOnly}
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
  onSelect,
  onClose,
}: {
  slotKey: string;
  players: TournamentPlayer[];
  teamLogoById: Map<number, string>;
  assignedPlayerIds: Set<number>;
  currentPlayerId?: number;
  onSelect: (player: TournamentPlayer) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const requiredPosition = getRequiredPositionForSlot(slotKey);
  const normalizedSearch = search.trim().toLowerCase();

  const candidates = players.filter((player) => {
    if (player.position !== requiredPosition) return false;
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
        className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-[#0F1E2E] p-5 shadow-2xl sm:rounded-2xl sm:border"
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
          className="mt-4 h-11 w-full rounded-full border border-white/10 bg-[#101D2C] px-4 text-sm text-zinc-100 outline-none focus:border-[#22E6C3]/50"
        />

        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
          className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto"
        >
          {candidates.length ? (
            candidates.map((player) => {
              const teamLogo = player.teams[0]
                ? teamLogoById.get(player.teams[0].id)
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
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
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
                    {teamLogo ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border border-black/40 bg-[#06111B]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={teamLogo} alt="" className="h-full w-full object-contain p-0.5" />
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-zinc-100">
                      {player.display_name}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                      {player.teams[0]?.name ?? "Squadra sconosciuta"}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <p className="px-3 py-6 text-center text-sm text-zinc-500">
              Nessun giocatore trovato per questo ruolo.
            </p>
          )}
        </div>
      </div>
    </div>
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
        className="absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
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
