"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { LeagueLogo } from "@/components/lobby/shared";
import { RegolamentoContent } from "@/components/tournament/RegolamentoContent";
import { TeamBuilder } from "@/components/tournament/TeamBuilder";
import { TeamPreviewModal } from "@/components/tournament/TeamPreviewModal";
import { useAuth } from "@/hooks/use-auth";
import { useCountdown } from "@/hooks/use-countdown";
import { getTournament, getTournamentRanking } from "@/lib/api/tournaments";
import { getMe } from "@/lib/auth-api";
import { formatMoney, formatPrizePool } from "@/lib/format";
import { logFrontendError } from "@/lib/frontend-logger";
import { getModuleCounts } from "@/lib/tournament-team";
import type {
  TournamentDetail,
  TournamentFixture,
  TournamentRankingEntry,
} from "@/types/tournament";

type DetailTab = "formazione" | "eventi" | "classifica" | "regolamento";

const DETAIL_TABS: Array<{ value: DetailTab; label: string }> = [
  { value: "formazione", label: "Formazione" },
  { value: "eventi", label: "Eventi" },
  { value: "classifica", label: "Classifica" },
  { value: "regolamento", label: "Regolamento" },
];

export default function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = Number(id);
  const { token, isAuthenticated, setUser } = useAuth();
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formationError, setFormationError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("formazione");
  const hasInitializedBuilder = useRef(false);

  const reload = useCallback(
    async (isActive: () => boolean = () => true) => {
      if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
        setError("Torneo non valido.");
        return;
      }

      setIsRefreshing(true);

      try {
        const data = await getTournament(tournamentId, token);
        if (!isActive()) return;

        setTournament(data);
        setError(null);

        if (data.is_user_registered && !data.user_fanta_team) {
          logFrontendError(
            "Risposta torneo incoerente: utente iscritto senza user_fanta_team",
            { tournamentId }
          );
          setFormationError(
            "La tua iscrizione risulta attiva, ma la formazione non e' disponibile. Riprova a sincronizzare i dati."
          );
          setIsBuilding(false);
        } else {
          setFormationError(null);
          if (!hasInitializedBuilder.current) {
            setIsBuilding(
              Boolean(
                data.is_user_registered &&
                  data.user_fanta_team &&
                  data.is_editable
              )
            );
            hasInitializedBuilder.current = true;
          }
        }
      } catch (requestError) {
        if (!isActive()) return;
        logFrontendError(
          "Caricamento del dettaglio torneo non riuscito",
          { tournamentId },
          requestError
        );
        setError("Impossibile caricare il torneo.");
      } finally {
        if (isActive()) setIsRefreshing(false);
      }
    },
    [tournamentId, token]
  );

  useEffect(() => {
    let isActive = true;
    void Promise.resolve().then(() => reload(() => isActive));
    return () => {
      isActive = false;
    };
  }, [reload]);

  return (
    <div className="py-4 lg:py-5">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#3AF5D4] transition hover:text-[#E9FFFA]"
      >
        <ArrowLeftIcon />
        Torna ai tornei
      </Link>

      {error ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-950/35 px-5 py-4 text-sm text-red-200">
          <span>{error}</span>
          <RetryButton
            isLoading={isRefreshing}
            onRetry={() => void reload()}
          />
        </div>
      ) : !tournament ? (
        <TournamentDetailSkeleton />
      ) : (
        <div className="mt-4 space-y-4">
          <article className="relative min-h-[128px] overflow-hidden rounded-xl border border-[#1E3448] bg-[#0F1E2E] shadow-[0_22px_60px_rgba(0,0,0,0.32)] sm:min-h-[168px] sm:border-[#22E6C3]/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- asset sostituito spesso durante lo sviluppo: la cache dell'ottimizzatore next/image intrappolava versioni vecchie */}
            <img
              src="/images/banner-torneo.png"
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,27,0.42)_0%,rgba(6,17,27,0.08)_58%,rgba(6,17,27,0.28)_100%)]" />

            <div className="relative grid min-h-[128px] gap-4 p-4 pt-12 sm:min-h-[168px] sm:gap-6 sm:p-7 sm:pt-16 lg:grid-cols-[minmax(280px,0.85fr)_minmax(520px,1.4fr)] lg:items-center lg:pt-7">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#1ED8B7]">
                  Fantashot
                </p>
                <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {tournament.title}
                </h1>
                <p className="mt-1.5 hidden text-sm text-zinc-400 sm:line-clamp-2">
                  {tournament.description}
                </p>
                {tournament.leagues.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tournament.leagues.map((league) => (
                      <div
                        key={league.id}
                        className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3 py-1.5"
                      >
                        <LeagueLogo logoUrl={league.logo} label={league.name} />
                        <span className="text-xs font-bold text-zinc-100">
                          {league.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-3 gap-2 lg:pr-3">
                <StatTile icon={<TrophyIcon />} label="Montepremi" value={formatPrizePool(tournament.prize_pool)} />
                <StatTile icon={<CoinIcon />} label="Quota" value={formatMoney(tournament.buy_in)} />
                <StatTile icon={<UsersIcon />} label="Partecipanti" value={`${tournament.enrolled_users_count}/${tournament.max_participants}`} />
              </div>
            </div>

            <div className="absolute right-3 top-3 sm:right-5 sm:top-5">
              <div className="sm:hidden">
                <MobileStatusLine
                  status={tournament.status}
                  endDate={
                    tournament.status === "enrollments"
                      ? tournament.enrollments_end_date
                      : null
                  }
                />
              </div>
              <div className="hidden flex-col items-end gap-2 sm:flex">
                <StatusBadge status={tournament.status} />
                {tournament.status === "enrollments" ? (
                  <EnrollmentCountdown endDate={tournament.enrollments_end_date} />
                ) : null}
              </div>
            </div>
          </article>

          <section className="overflow-visible rounded-2xl border border-[#1E3448] bg-gradient-to-b from-[#123A3B]/20 to-[#0F1E2E]/80 shadow-[0_0_0_1px_rgba(34,230,195,0.08)] sm:overflow-hidden sm:border-[#22E6C3]/25">
            <div className="sticky top-0 z-30 rounded-t-2xl border-b border-white/10 bg-[#0A1420]/95 p-2 backdrop-blur sm:static sm:rounded-none sm:bg-black/15 sm:p-4">
              <TournamentDetailTabs activeTab={activeTab} onChange={setActiveTab} />
            </div>

            <div
              className={
                activeTab === "formazione" && isBuilding ? "" : "p-3 sm:p-7"
              }
            >
              {activeTab === "formazione" ? (
                formationError ? (
                  <FormationSyncError
                    message={formationError}
                    isLoading={isRefreshing}
                    onRetry={() => void reload()}
                  />
                ) : isBuilding ? (
                  <TeamBuilder
                    tournament={tournament}
                    mode={tournament.is_user_registered ? "edit" : "create"}
                    onCancel={() => setIsBuilding(false)}
                    onSaved={async () => {
                      const isNewEnrollment = !tournament.is_user_registered;
                      const walletRefresh =
                        isNewEnrollment && token
                          ? getMe(token)
                              .then(({ user, wallets }) => {
                                setUser({ ...user, wallets });
                              })
                              .catch((requestError) => {
                                logFrontendError(
                                  "Aggiornamento del saldo dopo l'iscrizione non riuscito",
                                  { tournamentId },
                                  requestError
                                );
                              })
                          : Promise.resolve();

                      await Promise.all([reload(), walletRefresh]);
                      setIsBuilding(false);
                    }}
                  />
                ) : (
                  <EnrollmentPanel
                    tournament={tournament}
                    isAuthenticated={isAuthenticated}
                    onStart={() => setIsBuilding(true)}
                  />
                )
              ) : activeTab === "eventi" ? (
                <div>
                  <p className="mb-4 text-xs text-zinc-500">
                    {tournament.fixtures.length} partite valide per questo torneo
                  </p>
                  {tournament.fixtures.length ? (
                    <div className="space-y-5">
                      {groupFixturesByLeague(tournament.fixtures).map((group) => (
                        <div key={group.league.id}>
                          <div className="mb-2 flex items-center gap-2 border-b border-white/10 pb-2">
                            <LeagueLogo logoUrl={group.league.logo} label={group.league.name} />
                            <h3 className="text-sm font-black text-white">
                              {group.league.name}
                            </h3>
                            <span className="text-xs text-zinc-500">
                              ({group.fixtures.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {group.fixtures.map((fixture) => (
                              <FixtureRow key={fixture.id} fixture={fixture} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500">
                      Nessun evento assegnato ancora a questo torneo.
                    </p>
                  )}
                </div>
              ) : activeTab === "classifica" ? (
                <ClassificaPanel
                  key={tournamentId}
                  tournament={tournament}
                  token={token}
                  ownTeamId={tournament.user_fanta_team?.id}
                />
              ) : (
                <RegolamentoContent />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function TournamentDetailTabs({
  activeTab,
  onChange,
}: {
  activeTab: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1 sm:grid-cols-4">
      {DETAIL_TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wide transition sm:py-2 sm:text-sm ${
            activeTab === tab.value
              ? "bg-[#18C6A7] text-[#06111B] shadow-[0_0_12px_rgba(24,198,167,0.3)] sm:bg-[#22E6C3] sm:shadow-[0_0_18px_rgba(34,230,195,0.35)]"
              : "text-zinc-400 hover:text-[#E9FFFA]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function ClassificaPanel({
  tournament,
  token,
  ownTeamId,
}: {
  tournament: TournamentDetail;
  token: string | null;
  ownTeamId?: number;
}) {
  const tournamentId = tournament.id;
  const [entries, setEntries] = useState<TournamentRankingEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTeamId, setPreviewTeamId] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;

    getTournamentRanking(tournamentId, token)
      .then((data) => {
        if (isActive) setEntries(data);
      })
      .catch((requestError) => {
        if (!isActive) return;
        logFrontendError(
          "Caricamento della classifica non riuscito",
          { tournamentId },
          requestError
        );
        setError("Impossibile caricare la classifica.");
      });

    return () => {
      isActive = false;
    };
  }, [tournamentId, token]);

  if (error) {
    return (
      <p className="rounded-lg border border-red-500/20 bg-red-950/35 px-4 py-3 text-sm text-red-200">
        {error}
      </p>
    );
  }

  if (!entries) {
    return (
      <div className="space-y-2" aria-label="Caricamento classifica">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-14 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        Nessuna fantasquadra ancora in classifica.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, index) => {
        const position = index + 1;
        const isOwn = entry.id === ownTeamId;

        return (
          <button
            key={entry.id}
            type="button"
            onClick={() => setPreviewTeamId(entry.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition hover:border-[#22E6C3]/30 ${
              isOwn
                ? "border-[#22E6C3]/40 bg-[#123A3B]/25"
                : "border-white/10 bg-black/20"
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                position <= 3
                  ? "bg-amber-400 text-black"
                  : "bg-white/10 text-zinc-300"
              }`}
            >
              {position}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {entry.name}
                {isOwn ? (
                  <span className="ml-2 text-[10px] font-black uppercase tracking-wide text-[#3AF5D4]">
                    Tu
                  </span>
                ) : null}
              </p>
              {entry.user.username || entry.user.name ? (
                <p className="truncate text-xs text-zinc-500">
                  {entry.user.username ?? entry.user.name}
                </p>
              ) : null}
            </div>
            <div className="shrink-0 text-right">
              <p className="text-base font-black text-white">
                {entry.points} pt
              </p>
              {entry.captain_points ? (
                <p className="text-[10px] text-zinc-500">
                  +{entry.captain_points} capitano
                </p>
              ) : null}
            </div>
          </button>
        );
      })}

      {previewTeamId ? (
        <TeamPreviewModal
          tournament={tournament}
          teamId={previewTeamId}
          onClose={() => setPreviewTeamId(null)}
        />
      ) : null}
    </div>
  );
}

function FormationSyncError({
  message,
  isLoading,
  onRetry,
}: {
  message: string;
  isLoading: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-red-300">
          Formazione non sincronizzata
        </p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-red-100/80">
          {message}
        </p>
      </div>
      <RetryButton isLoading={isLoading} onRetry={onRetry} />
    </div>
  );
}

function RetryButton({
  isLoading,
  onRetry,
}: {
  isLoading: boolean;
  onRetry: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={isLoading}
      className="flex h-10 items-center rounded-lg border border-red-400/30 px-4 text-xs font-black uppercase tracking-wide text-red-200 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? "Sincronizzazione..." : "Riprova"}
    </button>
  );
}

function EnrollmentPanel({
  tournament,
  isAuthenticated,
  onStart,
}: {
  tournament: TournamentDetail;
  isAuthenticated: boolean;
  onStart: () => void;
}) {
  const countdown = useCountdown(
    tournament.status === "enrollments" ? tournament.enrollments_end_date : null
  );

  if (!isAuthenticated) {
    return (
      <div className="text-center">
        <p className="text-sm text-zinc-300">
          Accedi per iscriverti e comporre la tua formazione.
        </p>
        <Link
          href="/login"
          className="mt-3 inline-flex h-11 items-center rounded-lg bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] px-5 text-sm font-black uppercase tracking-wide text-[#06111B]"
        >
          Accedi
        </Link>
      </div>
    );
  }

  const team = tournament.user_fanta_team;

  if (team) {
    const teamModule = tournament.modules.find((item) => item.id === team.module_id);
    const counts = teamModule ? getModuleCounts(teamModule) : null;

    return (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#22E6C3]/15 text-[#3AF5D4]">
            <CheckIcon />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#3AF5D4]">
              Sei iscritto
            </p>
            <h2 className="text-lg font-black text-white">{team.name}</h2>
            <p className="mt-0.5 text-sm text-zinc-400">
              Modulo {teamModule?.name ?? team.module_id}
              {counts ? ` (${counts.defenders}-${counts.midfielders}-${counts.forwards})` : ""}
              {team.points ? ` · ${team.points} punti` : ""}
            </p>
          </div>
        </div>

        {tournament.is_editable ? (
          <button
            type="button"
            onClick={onStart}
            className="flex h-11 items-center rounded-lg border border-[#22E6C3]/40 px-5 text-sm font-black uppercase tracking-wide text-[#E9FFFA] transition hover:bg-[#22E6C3]/10"
          >
            Modifica formazione
          </button>
        ) : (
          <p className="text-xs text-zinc-500">
            Formazione bloccata: le iscrizioni sono chiuse.
          </p>
        )}
      </div>
    );
  }

  if (tournament.status !== "enrollments") {
    return (
      <p className="text-center text-sm text-zinc-500">
        Le iscrizioni per questo torneo non sono aperte.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-[#3AF5D4]">
          Consegna la squadra entro
        </p>
        <p className="mt-1 font-mono text-3xl font-black text-white">
          {countdown ?? "--:--:--"}
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex h-12 items-center rounded-lg bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] px-6 text-sm font-black uppercase tracking-wide text-[#06111B] shadow-[0_10px_30px_rgba(34,230,195,0.35)] transition hover:from-[#1ED8B7] hover:to-[#22E6C3]"
      >
        Crea la formazione · Quota {formatMoney(tournament.buy_in)}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: TournamentDetail["status"] }) {
  const isLive = status === "enrollments" || status === "in-progress";

  return (
    <span
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-black uppercase tracking-wide ${
        status === "cancelled"
          ? "border-transparent bg-zinc-800/70 text-zinc-500 line-through decoration-zinc-600"
          : "border-[#22E6C3] bg-[#123A3B] text-[#22E6C3]"
      }`}
    >
      {isLive ? <span className="h-2 w-2 animate-pulse rounded-full bg-current" /> : null}
      {getStatusLabel(status)}
    </span>
  );
}

function EnrollmentCountdown({ endDate }: { endDate: string }) {
  const countdown = useCountdown(endDate);

  if (!countdown) return null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-zinc-200 backdrop-blur-sm">
      <span className="text-[#1ED8B7]"><CalendarIcon /></span>
      Chiude tra <span className="font-mono text-white">{countdown}</span>
    </div>
  );
}

/** Su mobile badge stato + countdown diventano un'unica riga, per non occupare due pill separate sopra l'hero. */
function MobileStatusLine({
  status,
  endDate,
}: {
  status: TournamentDetail["status"];
  endDate: string | null;
}) {
  const isLive = status === "enrollments" || status === "in-progress";
  const countdown = useCountdown(endDate);

  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${
        status === "cancelled"
          ? "border-transparent bg-zinc-800/70 text-zinc-500 line-through decoration-zinc-600"
          : "border-[#22E6C3] bg-[#123A3B] text-[#22E6C3]"
      }`}
    >
      {isLive ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current animate-pulse" /> : null}
      {getStatusLabel(status)}
      {countdown ? <span className="font-mono text-white">{countdown}</span> : null}
    </span>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1 px-1 py-2 text-center sm:flex-row sm:items-center sm:gap-2.5 sm:px-4 sm:text-left">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[#1D6D68] bg-[#123A3B] text-[#3AF5D4] sm:h-9 sm:w-9">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9px] font-medium leading-tight text-zinc-400 sm:text-[10px]">
          {label}
        </p>
        <p className="truncate text-sm font-black text-white sm:text-xl">{value}</p>
      </div>
    </div>
  );
}

function groupFixturesByLeague(fixtures: TournamentFixture[]) {
  const groups = new Map<
    number,
    { league: TournamentFixture["league"]; fixtures: TournamentFixture[] }
  >();

  fixtures.forEach((fixture) => {
    const existing = groups.get(fixture.league.id);
    if (existing) {
      existing.fixtures.push(fixture);
    } else {
      groups.set(fixture.league.id, { league: fixture.league, fixtures: [fixture] });
    }
  });

  return Array.from(groups.values());
}

function FixtureRow({ fixture }: { fixture: TournamentFixture }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 transition hover:border-[#22E6C3]/30 hover:bg-[#123A3B]/15 sm:min-h-[78px] sm:px-4">
      {/* Mobile: nomi squadra centrati e per intero, niente logo campionato ripetuto (gia' nell'intestazione del gruppo sopra). */}
      <div className="sm:hidden">
        <div className="flex items-center justify-end gap-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400">
            <CalendarIcon />
            <FixtureDateInline value={fixture.start_date} />
          </span>
        </div>
        <div className="mt-2.5 flex flex-col items-center gap-1.5 text-center">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
            <span className="h-6 w-6 shrink-0 rounded-full bg-white/5 p-0.5">
              {fixture.home_team.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fixture.home_team.logo} alt="" className="h-full w-full object-contain" />
              ) : null}
            </span>
            {fixture.home_team.name}
          </span>
          <span className="text-[9px] font-black uppercase text-zinc-600">vs</span>
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
            <span className="h-6 w-6 shrink-0 rounded-full bg-white/5 p-0.5">
              {fixture.away_team.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fixture.away_team.logo} alt="" className="h-full w-full object-contain" />
              ) : null}
            </span>
            {fixture.away_team.name}
          </span>
        </div>
      </div>

      {/* Desktop: layout originale invariato. */}
      <div className="hidden items-center justify-between gap-3 sm:flex">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <LeagueLogo logoUrl={fixture.league.logo} label={fixture.league.name} />
          <div className="min-w-0 flex-1">
            <p className="mb-1 truncate text-[10px] font-medium text-zinc-400">
              {fixture.league.name}
            </p>
            <div className="flex min-w-0 items-center gap-2.5">
              <TeamBadge name={fixture.home_team.name} logo={fixture.home_team.logo} />
              <span className="shrink-0 text-[9px] font-black uppercase text-zinc-600">vs</span>
              <TeamBadge name={fixture.away_team.name} logo={fixture.away_team.logo} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-l border-white/10 pl-3">
          <span className="text-zinc-500"><CalendarIcon /></span>
          <FixtureDate value={fixture.start_date} />
          <span className="text-xl leading-none text-zinc-500">›</span>
        </div>
      </div>
    </div>
  );
}

function FixtureDateInline({ value }: { value: string }) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <span>{value}</span>;
  }

  return (
    <span className="whitespace-nowrap">
      {new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }).format(date)}{" "}
      ·{" "}
      {new Intl.DateTimeFormat("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)}
    </span>
  );
}

function FixtureDate({ value }: { value: string }) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return <p className="text-xs font-bold text-zinc-300">{value}</p>;
  }

  return (
    <div>
      <p className="whitespace-nowrap text-[10px] font-medium text-zinc-400">
        {new Intl.DateTimeFormat("it-IT", {
          weekday: "short",
          day: "2-digit",
          month: "short",
        }).format(date)}
      </p>
      <p className="text-base font-black text-white">
        {new Intl.DateTimeFormat("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(date)}
      </p>
    </div>
  );
}

function TeamBadge({
  name,
  logo,
  align = "left",
}: {
  name: string;
  logo: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <span className="relative h-8 w-8 shrink-0 rounded-full bg-white/5 p-1">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-full w-full object-contain" />
        ) : null}
      </span>
      <span className="max-w-24 truncate text-xs font-bold text-zinc-100 sm:max-w-28 sm:text-sm">{name}</span>
    </span>
  );
}

function TournamentDetailSkeleton() {
  return (
    <div
      aria-label="Caricamento torneo"
      className="mt-5 animate-pulse overflow-hidden rounded-2xl border border-white/8 bg-[#0F1E2E]/75"
    >
      <div className="h-44 bg-white/[0.035]" />
      <div className="grid grid-cols-3 divide-x divide-white/8">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-20 bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}

function getStatusLabel(status: TournamentDetail["status"]) {
  const labels: Record<TournamentDetail["status"], string> = {
    draft: "Bozza",
    ready: "Pronto",
    enrollments: "Iscrizioni aperte",
    "waiting-for-start": "In attesa",
    "in-progress": "In corso",
    finished: "Concluso",
    paid: "Premi pagati",
    cancelled: "Annullato",
  };

  return labels[status];
}

function ArrowLeftIcon() {
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
      <path d="m12 19-7-7 7-7M19 12H5" />
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
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M17 5h2a2 2 0 0 1 2 2 3 3 0 0 1-3 3h-1" />
      <path d="M7 5H5a2 2 0 0 0-2 2 3 3 0 0 0 3 3h1" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 15.5c0 1 1 1.5 2.5 1.5s2.5-.6 2.5-1.5-1-1.3-2.5-1.6-2.5-.7-2.5-1.6.9-1.5 2.5-1.5 2.5.5 2.5 1.5" />
      <path d="M12 7v1M12 16v1" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}
