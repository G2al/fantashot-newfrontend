"use client";

import { LeagueLogo } from "@/components/lobby/shared";
import type { TournamentFixture } from "@/types/tournament";

const FINAL_STATES = ["FT", "AET", "FT_PEN"];

type FixtureView = {
  fixture: TournamentFixture;
  date: Date | null;
  hasScore: boolean;
  isFinal: boolean;
  homeWon: boolean;
  awayWon: boolean;
};

type DayGroup = { key: string; date: Date | null; items: FixtureView[] };

/** "YYYY-MM-DD HH:mm:ss" non e' ISO: Safari lo rifiuta senza la "T". */
function parseFixtureDate(value: string): Date | null {
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? null : date;
}

function CheckCircleIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12.5l2 2 4.5-5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

function toView(fixture: TournamentFixture): FixtureView {
  const { home_team_score: home, away_team_score: away, state } = fixture;
  const hasScore = home !== null && away !== null;
  const isFinal = hasScore && FINAL_STATES.includes(state);

  return {
    fixture,
    date: parseFixtureDate(fixture.start_date),
    hasScore,
    isFinal,
    homeWon: isFinal && home > away,
    awayWon: isFinal && away > home,
  };
}

function groupByDay(views: FixtureView[]): DayGroup[] {
  const sorted = [...views].sort(
    (a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0)
  );
  const groups = new Map<string, DayGroup>();

  sorted.forEach((view) => {
    const key = view.date
      ? `${view.date.getFullYear()}-${view.date.getMonth()}-${view.date.getDate()}`
      : "unknown";
    const group = groups.get(key) ?? { key, date: view.date, items: [] };
    group.items.push(view);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

const dayFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const timeFormatter = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
});

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function EventsPanel({
  fixtures,
  onGoToRanking,
}: {
  fixtures: TournamentFixture[];
  onGoToRanking: () => void;
}) {
  if (!fixtures.length) {
    return (
      <p className="text-sm text-zinc-500">
        Nessun evento assegnato ancora a questo torneo.
      </p>
    );
  }

  const views = fixtures.map(toView);
  const days = groupByDay(views);
  const finalCount = views.filter((view) => view.isFinal).length;
  const leagueCount = new Set(fixtures.map((fixture) => fixture.league.id)).size;
  const progress = Math.round((finalCount / views.length) * 100);
  const allFinal = finalCount === views.length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#1E3448] bg-black/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <p className="text-lg font-black text-[#22E6C3] sm:text-xl">
            {views.length} {views.length === 1 ? "partita" : "partite"}
          </p>
          <p className="text-lg font-black text-[#22E6C3] sm:text-xl">
            {leagueCount} {leagueCount === 1 ? "lega" : "leghe"}
          </p>
          <p
            className={`ml-auto flex items-center gap-1.5 text-xs font-bold ${
              allFinal ? "text-green-400" : "text-zinc-400"
            }`}
          >
            {allFinal ? (
              <>
                <CheckCircleIcon />
                Tutte concluse
              </>
            ) : (
              `${finalCount} di ${views.length} concluse`
            )}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={views.length}
          aria-valuenow={finalCount}
          aria-label="Partite concluse"
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              allFinal
                ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                : "bg-gradient-to-r from-[#18C6A7] to-[#22E6C3] shadow-[0_0_10px_rgba(34,230,195,0.5)]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {days.map((day) => (
        <section key={day.key}>
          <div className="mb-2.5 flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#22E6C3]/10 text-[#22E6C3]">
              <CalendarIcon />
            </span>
            <h3 className="text-sm font-black text-white sm:text-base">
              {day.date ? capitalize(dayFormatter.format(day.date)) : "Data da definire"}
            </h3>
            <span className="text-xs text-zinc-500">
              {day.items.length} {day.items.length === 1 ? "partita" : "partite"}
            </span>
          </div>

          <div className="space-y-4 sm:space-y-2">
            {day.items.map((view) => (
              <FixtureRow key={view.fixture.id} view={view} />
            ))}
          </div>
        </section>
      ))}

      {allFinal ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[#22E6C3]/25 bg-gradient-to-r from-[#123A3B]/40 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-sm font-black text-white">
              Tutte le partite di questo torneo sono state giocate
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Controlla come si è piazzata la tua squadra.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToRanking}
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#22E6C3] bg-[#123A3B] px-4 text-xs font-black uppercase tracking-wide text-[#22E6C3] transition hover:bg-[#22E6C3]/20"
          >
            Vai alla classifica
          </button>
        </div>
      ) : null}
    </div>
  );
}

function FixtureRow({ view }: { view: FixtureView }) {
  const { fixture, date, hasScore, isFinal, homeWon, awayWon } = view;
  const time = date ? timeFormatter.format(date) : "--:--";

  return (
    <div className="relative rounded-xl border border-[#1E3448] bg-[#0F1E2E]/70 transition hover:border-white/20">
      {/* Mobile: due righe squadra + colonna punteggio, ~64px per partita. */}
      <div className="px-3 pb-3 pt-4 sm:hidden">
        <span className="absolute -top-2.5 left-3 flex max-w-[70%] items-center gap-1.5 rounded-full border border-[#1E3448] bg-[#0F1E2E] py-0.5 pl-1 pr-2.5 sm:hidden">
          {fixture.league.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fixture.league.logo} alt="" className="h-4 w-4 shrink-0 object-contain" />
          ) : null}
          <span className="truncate text-[9px] font-black uppercase tracking-wide text-zinc-300">
            {fixture.league.name}
          </span>
        </span>
        <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="text-sm font-black text-white">{time}</span>
          <StatusPill hasScore={hasScore} isFinal={isFinal} compact />
        </div>

        <div className="min-w-0 space-y-2">
          <MobileTeam
            name={fixture.home_team.name}
            logo={fixture.home_team.logo}
            lost={awayWon}
          />
          <MobileTeam
            name={fixture.away_team.name}
            logo={fixture.away_team.logo}
            lost={homeWon}
          />
        </div>

        <div className="flex flex-col items-end gap-2">
          <MobileScore
            value={fixture.home_team_score}
            won={homeWon}
            lost={awayWon}
            live={hasScore && !isFinal}
          />
          <MobileScore
            value={fixture.away_team_score}
            won={awayWon}
            lost={homeWon}
            live={hasScore && !isFinal}
          />
        </div>
        </div>
      </div>

      {/* Desktop: lega, casa, punteggio, ospite, orario. */}
      <div className="hidden min-h-[84px] grid-cols-[170px_minmax(0,1fr)_auto_minmax(0,1fr)_120px] items-center gap-5 px-5 sm:grid">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-9 w-9 shrink-0">
            <LeagueLogo logoUrl={fixture.league.logo} label={fixture.league.name} large />
          </span>
          <p className="truncate text-sm font-bold text-zinc-200">{fixture.league.name}</p>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-3">
          <span
            className={`min-w-0 text-right text-base font-black leading-tight ${
              awayWon ? "text-zinc-500" : "text-white"
            }`}
          >
            {fixture.home_team.name}
          </span>
          <Crest logo={fixture.home_team.logo} dimmed={awayWon} />
        </div>

        <div className="flex min-w-[112px] flex-col items-center gap-1.5">
          {hasScore ? (
            <span
              className={`flex items-center gap-2.5 rounded-xl border bg-black/30 px-4 py-1.5 font-black tabular-nums ${
                isFinal
                  ? "border-[#22E6C3]/30 shadow-[0_0_18px_rgba(34,230,195,0.12)]"
                  : "border-[#22E6C3]/60 shadow-[0_0_18px_rgba(34,230,195,0.25)]"
              }`}
            >
              <span className={`text-3xl ${digitClass(homeWon, awayWon, isFinal)}`}>
                {fixture.home_team_score}
              </span>
              <span className="text-xl text-zinc-600">-</span>
              <span className={`text-3xl ${digitClass(awayWon, homeWon, isFinal)}`}>
                {fixture.away_team_score}
              </span>
            </span>
          ) : (
            <span className="text-sm font-black uppercase tracking-wide text-zinc-600">vs</span>
          )}
          <StatusPill hasScore={hasScore} isFinal={isFinal} />
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <Crest logo={fixture.away_team.logo} dimmed={homeWon} />
          <span
            className={`min-w-0 text-base font-black leading-tight ${
              homeWon ? "text-zinc-500" : "text-white"
            }`}
          >
            {fixture.away_team.name}
          </span>
        </div>

        <p className="text-right text-2xl font-black tabular-nums text-white">{time}</p>
      </div>
    </div>
  );
}

/** Vincitore in teal, perdente attenuato, pareggio/live in bianco o teal. */
function digitClass(won: boolean, lost: boolean, isFinal: boolean) {
  if (lost) return "text-zinc-500";
  if (won) return "text-[#22E6C3]";
  return isFinal ? "text-white" : "text-[#22E6C3]";
}

function MobileTeam({
  name,
  logo,
  lost,
}: {
  name: string;
  logo: string;
  lost: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`h-7 w-7 shrink-0 rounded-full bg-white/5 p-1 ${lost ? "opacity-50" : ""}`}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-full w-full object-contain" />
        ) : null}
      </span>
      <span
        className={`min-w-0 text-sm font-bold leading-tight ${
          lost ? "text-zinc-500" : "text-white"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function MobileScore({
  value,
  won,
  lost,
  live,
}: {
  value: number | null;
  won: boolean;
  lost: boolean;
  live: boolean;
}) {
  return (
    <span
      className={`flex h-7 min-w-6 items-center justify-end text-lg font-black tabular-nums ${
        value === null
          ? "text-zinc-700"
          : lost
            ? "text-zinc-500"
            : won || live
              ? "text-[#22E6C3]"
              : "text-white"
      }`}
    >
      {value ?? "-"}
    </span>
  );
}

function Crest({ logo, dimmed }: { logo: string; dimmed: boolean }) {
  return (
    <span
      className={`h-11 w-11 shrink-0 rounded-full bg-white/5 p-2 ${dimmed ? "opacity-50" : ""}`}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" className="h-full w-full object-contain" />
      ) : null}
    </span>
  );
}

function StatusPill({
  hasScore,
  isFinal,
  compact = false,
}: {
  hasScore: boolean;
  isFinal: boolean;
  compact?: boolean;
}) {
  const label = !hasScore ? "In programma" : isFinal ? "Finale" : "Live";
  const tone = !hasScore
    ? "border-[#1E3448] text-zinc-500"
    : isFinal
      ? "border-white/15 text-zinc-300"
      : "border-[#22E6C3] bg-[#123A3B] text-[#22E6C3]";

  return (
    <span
      className={`flex items-center gap-1 rounded-full border font-black uppercase tracking-wide ${tone} ${
        compact ? "px-1.5 py-0.5 text-[8px]" : "px-3 py-0.5 text-[10px]"
      }`}
    >
      {hasScore && !isFinal ? (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      ) : null}
      {compact && !hasScore ? "Prog." : label}
    </span>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}
