"use client";

import { formatMoney } from "@/lib/format";
import type { TournamentRankingEntry } from "@/types/tournament";

/**
 * Il backend chiama la squadra "Nome Cognome's Team": non serve mostrarlo.
 * Riga principale = nickname, secondaria = nome e cognome.
 */
export function getRankingOwner(entry: TournamentRankingEntry) {
  const teamOwnerName = entry.name.replace(/['’]s Team$/i, "").trim();
  const fullName = entry.user.name?.trim() || teamOwnerName;
  const nickname = entry.user.username?.trim() || fullName;

  return {
    nickname,
    fullName: fullName && fullName !== nickname ? fullName : null,
  };
}

const PLACES = {
  1: {
    label: "Vincitore",
    card: "border-amber-400/50 bg-gradient-to-b from-amber-400/15 to-[#0F1E2E] shadow-[0_0_30px_rgba(251,191,36,0.12)]",
    medal: "bg-amber-400 text-black",
    points: "text-amber-300",
    pad: "py-5 sm:pb-9 sm:pt-7",
  },
  2: {
    label: "2° posto",
    card: "border-zinc-300/30 bg-gradient-to-b from-zinc-300/10 to-[#0F1E2E]",
    medal: "bg-zinc-300 text-black",
    points: "text-zinc-200",
    pad: "py-4",
  },
  3: {
    label: "3° posto",
    card: "border-orange-400/30 bg-gradient-to-b from-orange-400/10 to-[#0F1E2E]",
    medal: "bg-orange-400 text-black",
    points: "text-orange-300",
    pad: "py-4",
  },
} as const;

export function RankingPodium({
  entries,
  ownTeamId,
  onSelect,
}: {
  entries: TournamentRankingEntry[];
  ownTeamId?: number;
  onSelect: (teamId: number) => void;
}) {
  const [first, second, third] = entries;

  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:items-end">
      {first ? (
        <PodiumCard
          entry={first}
          place={1}
          isOwn={first.id === ownTeamId}
          onSelect={onSelect}
          className="col-span-2 sm:order-2 sm:col-span-1"
        />
      ) : null}
      {second ? (
        <PodiumCard
          entry={second}
          place={2}
          isOwn={second.id === ownTeamId}
          onSelect={onSelect}
          className="sm:order-1"
        />
      ) : null}
      {third ? (
        <PodiumCard
          entry={third}
          place={3}
          isOwn={third.id === ownTeamId}
          onSelect={onSelect}
          className="sm:order-3"
        />
      ) : null}
    </div>
  );
}

function PodiumCard({
  entry,
  place,
  isOwn,
  onSelect,
  className = "",
}: {
  entry: TournamentRankingEntry;
  place: 1 | 2 | 3;
  isOwn: boolean;
  onSelect: (teamId: number) => void;
  className?: string;
}) {
  const style = PLACES[place];
  const owner = getRankingOwner(entry);

  return (
    <button
      type="button"
      onClick={() => onSelect(entry.id)}
      className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-3 text-center transition hover:brightness-110 ${style.card} ${style.pad} ${
        isOwn ? "ring-1 ring-[#22E6C3]/60" : ""
      } ${className}`}
    >
      <span
        className={`grid place-items-center rounded-full font-black ${style.medal} ${
          place === 1 ? "h-11 w-11" : "h-8 w-8 text-sm"
        }`}
      >
        {place === 1 ? <TrophyIcon /> : place}
      </span>
      <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
        {style.label}
      </span>
      <span
        className={`max-w-full truncate font-black text-white ${
          place === 1 ? "text-lg sm:text-xl" : "text-sm sm:text-base"
        }`}
      >
        {owner.nickname}
        {isOwn ? (
          <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide text-[#3AF5D4]">
            Tu
          </span>
        ) : null}
      </span>
      {owner.fullName ? (
        <span className="max-w-full truncate text-xs text-zinc-500">{owner.fullName}</span>
      ) : null}
      <span
        className={`font-black tabular-nums ${style.points} ${
          place === 1 ? "mt-1 text-3xl sm:text-4xl" : "mt-0.5 text-2xl"
        }`}
      >
        {formatPoints(entry.points)}
        <span className="ml-1 text-xs font-bold text-zinc-500">pt</span>
      </span>
      {entry.prize ? (
        <span className="mt-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-black text-amber-300">
          Premio {formatMoney(entry.prize)}
        </span>
      ) : null}
    </button>
  );
}

function formatPoints(points: number) {
  return points.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function TrophyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-6 w-6"
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
