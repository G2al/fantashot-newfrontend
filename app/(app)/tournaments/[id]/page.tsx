"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useCallback, useEffect, useRef, useState } from "react";
import { LeagueLogo } from "@/components/lobby/shared";
import { TeamBuilder } from "@/components/tournament/TeamBuilder";
import { useAuth } from "@/hooks/use-auth";
import { useCountdown } from "@/hooks/use-countdown";
import { getTournament } from "@/lib/api/tournaments";
import { getMe } from "@/lib/auth-api";
import { formatMoney, formatPrizePool } from "@/lib/format";
import { logFrontendError } from "@/lib/frontend-logger";
import { getModuleCounts } from "@/lib/tournament-team";
import type { TournamentDetail, TournamentFixture } from "@/types/tournament";

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
        className="inline-flex items-center gap-2 text-sm font-medium text-red-300 transition hover:text-red-200"
      >
        <ArrowLeftIcon />
        Torna ai tornei
      </Link>

      {error ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-950/35 px-5 py-4 text-sm text-amber-200">
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
          <article className="relative min-h-[168px] overflow-hidden rounded-xl border border-red-500/30 bg-[#1c0b09] shadow-[0_22px_60px_rgba(0,0,0,0.32)]">
            <Image
              src="/images/banner-torneo.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1680px) 1620px, 100vw"
              className="pointer-events-none object-cover object-center"
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(12,5,4,0.42)_0%,rgba(12,5,4,0.08)_58%,rgba(12,5,4,0.28)_100%)]" />

            <div className="relative grid min-h-[168px] gap-6 p-5 pt-16 sm:p-7 sm:pt-16 lg:grid-cols-[minmax(280px,0.85fr)_minmax(520px,1.4fr)] lg:items-center lg:pt-7">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-red-400">
                  Fantashot
                </p>
                <h1 className="mt-1 truncate text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {tournament.title}
                </h1>
                <p className="mt-1.5 line-clamp-2 text-sm text-zinc-400">
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

              <div className="grid grid-cols-3 divide-x divide-white/15 lg:pr-3">
                <StatTile icon={<TrophyIcon />} label="Montepremi" value={formatPrizePool(tournament.prize_pool)} />
                <StatTile icon={<CoinIcon />} label="Quota" value={formatMoney(tournament.buy_in)} />
                <StatTile icon={<UsersIcon />} label="Partecipanti" value={`${tournament.enrolled_users_count}/${tournament.max_participants}`} />
              </div>
            </div>

            <div className="absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-5 sm:top-5">
              <StatusBadge status={tournament.status} />
              {tournament.status === "enrollments" ? (
                <EnrollmentCountdown endDate={tournament.enrollments_end_date} />
              ) : null}
            </div>
          </article>

          <section className="rounded-xl border border-red-500/25 bg-[linear-gradient(135deg,rgba(48,12,10,0.86),rgba(21,7,5,0.96))] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white">
                <CalendarIcon />
                Eventi del torneo ({tournament.fixtures.length})
              </h2>
              <p className="text-xs text-zinc-500">Partite valide per questo torneo</p>
            </div>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {tournament.fixtures.length ? (
                tournament.fixtures.map((fixture) => (
                  <FixtureRow key={fixture.id} fixture={fixture} />
                ))
              ) : (
                <p className="text-sm text-zinc-500">
                  Nessun evento assegnato ancora a questo torneo.
                </p>
              )}
            </div>
          </section>

          {/* Iscrizione / formazione: e' il blocco "azione", deve staccarsi
              visivamente dal resto che e' solo informativo. */}
          <section
            className={
              isBuilding
                ? ""
                : "overflow-hidden rounded-2xl border border-red-500/25 bg-gradient-to-b from-red-950/20 to-[#1c0b09]/80 p-5 shadow-[0_0_0_1px_rgba(220,38,38,0.08)] sm:p-7"
            }
          >
            {formationError ? (
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
            )}
          </section>
        </div>
      )}
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
        <p className="text-xs font-black uppercase tracking-wide text-amber-300">
          Formazione non sincronizzata
        </p>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-amber-100/80">
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
      className="flex h-10 items-center rounded-lg border border-amber-400/30 px-4 text-xs font-black uppercase tracking-wide text-amber-200 transition hover:bg-amber-400/10 disabled:cursor-not-allowed disabled:opacity-60"
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
          className="mt-3 inline-flex h-11 items-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-5 text-sm font-black uppercase tracking-wide text-white"
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
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
            <CheckIcon />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-emerald-300">
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
            className="flex h-11 items-center rounded-lg border border-red-500/40 px-5 text-sm font-black uppercase tracking-wide text-red-200 transition hover:bg-red-500/10"
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
        <p className="text-xs font-black uppercase tracking-wide text-red-300">
          Consegna la squadra entro
        </p>
        <p className="mt-1 font-mono text-3xl font-black text-white">
          {countdown ?? "--:--:--"}
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex h-12 items-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-6 text-sm font-black uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(220,38,38,0.35)] transition hover:from-red-400 hover:to-red-500"
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
      className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-black uppercase tracking-wide ${
        status === "cancelled"
          ? "bg-zinc-800/70 text-zinc-500 line-through decoration-zinc-600"
          : "bg-red-500/15 text-red-200 ring-1 ring-red-500/30"
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
      <span className="text-red-400"><CalendarIcon /></span>
      Chiude tra <span className="font-mono text-white">{countdown}</span>
    </div>
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
    <div className="flex min-w-0 items-center gap-2.5 px-3 py-2 sm:px-6">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-red-500/10 text-red-400">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium text-zinc-400">
          {label}
        </p>
        <p className="truncate text-base font-black text-white sm:text-xl">{value}</p>
      </div>
    </div>
  );
}

function FixtureRow({ fixture }: { fixture: TournamentFixture }) {
  return (
    <div className="flex min-h-[78px] items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3.5 py-3 transition hover:border-red-500/30 hover:bg-red-950/15 sm:px-4">
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
      className="mt-5 animate-pulse overflow-hidden rounded-2xl border border-white/8 bg-[#1c0b09]/75"
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
