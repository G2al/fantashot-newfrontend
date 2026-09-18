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
  type LineupPayload,
  type TournamentDetail,
  type TournamentModule,
  type TournamentPlayer,
} from "@/types/tournament";

export function TeamBuilder({
  tournament,
  mode,
  onSaved,
  onCancel,
}: {
  tournament: TournamentDetail;
  mode: "create" | "edit";
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { token } = useAuth();
  const selectablePlayers = useMemo(
    () => tournament.players.filter(isSelectablePlayer),
    [tournament.players]
  );
  const teamLogoById = useMemo(
    () => buildTeamLogoMap(tournament.fixtures),
    [tournament.fixtures]
  );
  const existingTeam = tournament.user_fanta_team;
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
    mode === "edit" && existingTeam
      ? buildLineupFromFormationData(existingTeam.formation_data)
      : {}
  );
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedModule) {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-950/30 p-4 text-sm text-amber-200">
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

      await onSaved();
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
    <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-[linear-gradient(145deg,#1c0b09_0%,#120605_58%,#1a0807_100%)] shadow-[0_26px_80px_rgba(0,0,0,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-black/15 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-red-500/12 text-red-500">
            <FormationIcon />
          </span>
          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-white">
              {mode === "create" ? "Crea formazione" : "Modifica formazione"}
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Tocca uno slot per scegliere il giocatore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
            Modulo
          </span>
          <ModuleSelect
            modules={tournament.modules}
            value={moduleId}
            onChange={handleModuleChange}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="min-w-0 xl:border-r xl:border-red-500/20">
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
                <span className="text-red-500"><BenchIcon /></span>
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
                    onOpenPicker={() => setActiveSlot(slotKey)}
                    onToggleCaptain={() => handleToggleCaptain(slotKey)}
                    onRemove={() => handleRemovePlayer(slotKey)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        <FormationSummary
          tournament={tournament}
          completed={completedStarterSlots}
          total={starterSlotKeys.length}
        />
      </div>

      {error ? (
        <p className="mx-4 mt-4 rounded-lg border border-amber-500/20 bg-amber-950/60 px-4 py-3 text-sm text-amber-200 sm:mx-6">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-white/10 bg-black/15 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${isComplete ? "bg-emerald-400" : "bg-amber-400"}`} />
          <p className="text-xs font-semibold text-zinc-400">
            {missingSlots.length
              ? `${missingSlots.length} slot da completare`
              : captainCount === 1
                ? "Formazione completa"
                : "Manca il capitano"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-bold text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-28"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleRandomize}
            disabled={isSubmitting}
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.03] px-6 text-sm font-bold text-zinc-200 transition hover:border-red-500/40 hover:bg-red-500/5 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-32"
          >
            <DiceIcon />
            Casuale
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-7 text-sm font-black uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(220,38,38,0.35)] transition hover:from-red-400 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-56"
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
        </div>
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
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-[#0c0504]/80 px-6 text-center backdrop-blur-sm">
          <div>
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-red-500" />
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
}: {
  tournament: TournamentDetail;
  completed: number;
  total: number;
}) {
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const competition =
    tournament.leagues.length > 1
      ? `${tournament.leagues.length} campionati`
      : tournament.leagues[0]?.name ?? "Non assegnata";

  return (
    <aside className="border-t border-red-500/20 bg-black/15 p-4 sm:p-5 xl:border-t-0">
      <div className="rounded-xl border border-red-500/25 bg-[linear-gradient(145deg,rgba(35,10,8,0.9),rgba(18,6,5,0.96))] p-4">
        <section>
        <div className="flex items-center gap-2 text-red-500">
          <FormationIcon />
          <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-white">
            Stato formazione
          </h3>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-black text-white">{completed}/{total}</span>
        </div>
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs">
          <div className="flex items-center justify-between gap-3 text-zinc-400">
            <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border border-zinc-600" />Slot da completare</span>
            <strong className="text-white">{Math.max(0, total - completed)}</strong>
          </div>
          <div className="flex items-center justify-between gap-3 text-zinc-400">
            <span className="flex items-center gap-2"><span className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[9px] font-black text-black">✓</span>Slot completati</span>
            <strong className="text-white">{completed}</strong>
          </div>
        </div>
        </section>

        <section className="mt-5 border-t border-red-500/25 pt-5">
        <div className="flex items-center gap-2 text-red-500">
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
              <span className={`h-2.5 w-2.5 rounded-full ${tournament.status === "enrollments" ? "bg-emerald-500" : "bg-red-500"}`} />
              {getTournamentStatusLabel(tournament.status)}
            </dd>
          </div>
        </dl>
        </section>

        <div className="mt-5 rounded-xl border border-red-500/25 bg-red-950/20 p-4">
          <p className="flex items-center gap-2 text-xs font-black text-red-400">
            <span className="text-lg">ϟ</span>
            Consiglio
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Scegli con attenzione la tua formazione. Potrai modificarla finché le iscrizioni sono aperte.
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
  onOpenPicker,
  onToggleCaptain,
  onRemove,
}: {
  slotKey: string;
  player: TournamentPlayer | null;
  teamLogoById: Map<number, string>;
  isCaptain: boolean;
  size: "pitch" | "bench";
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
          aria-label={player ? player.display_name : getSlotLabel(slotKey)}
          className={`relative flex items-center justify-center overflow-hidden rounded-full text-[10px] font-black shadow-lg transition ${avatarSize} ${
            player
              ? isCaptain
                ? "border-2 border-amber-400 bg-[#1c0b09] text-white"
                : "border-2 border-white/80 bg-[#1c0b09] text-white"
              : "border-0 bg-transparent text-white hover:scale-105"
          }`}
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
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-black/40 bg-[#0c0504] shadow">
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

      {player ? (
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
            className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-white/50 hover:bg-red-500/20 hover:text-red-300"
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

      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-[#1c0b09] p-5 shadow-2xl sm:rounded-2xl sm:border">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-red-300">
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
          className="mt-4 h-11 w-full rounded-full border border-white/10 bg-[#150705] px-4 text-sm text-zinc-100 outline-none focus:border-red-500/50"
        />

        <div className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
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
                      ? "bg-red-500/15 text-red-100"
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
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border border-black/40 bg-[#0c0504]">
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
    <div className="absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(72,19,14,0.34),transparent_68%)]">
      <div className="absolute inset-x-[8%] bottom-[7%] top-[13%] bg-[radial-gradient(ellipse_at_center,rgba(16,185,44,0.2),transparent_65%)] blur-2xl" />
      <Image
        src="/images/tournament-pitch.png"
        alt="Campo da calcio Fantashot"
        fill
        sizes="(min-width: 1280px) 1100px, 100vw"
        priority
        className="object-contain"
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
