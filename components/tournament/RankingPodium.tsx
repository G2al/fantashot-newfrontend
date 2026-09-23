"use client";

import { UserAvatar } from "@/components/UserAvatar";
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

/**
 * Ogni misura scala con il piazzamento (1° piu' grande di tutto), per dare
 * la stessa gerarchia visiva di un podio vero. Stessa identica struttura su
 * mobile e desktop (tre colonne coi gradini che si toccano alla base),
 * cambia solo la taglia.
 */
const PLACES = {
  1: {
    label: "Vincitore",
    points: "text-amber-300",
    ring: "border-amber-400",
    avatar: "h-20 w-20 sm:h-28 sm:w-28",
    medal: "h-8 w-8 sm:h-11 sm:w-11 -left-1 -top-1 sm:-left-2 sm:-top-2",
    nameSize: "text-sm sm:text-lg",
    pointsSize: "mt-0.5 text-2xl sm:mt-1 sm:text-4xl",
    step: "h-20 sm:h-32",
    width: "w-28 sm:w-48",
    overlap: "",
  },
  2: {
    label: "2° posto",
    points: "text-zinc-200",
    ring: "border-zinc-300",
    avatar: "h-14 w-14 sm:h-24 sm:w-24",
    medal: "h-6 w-6 sm:h-9 sm:w-9 -left-0.5 -top-0.5 sm:-left-1 sm:-top-1",
    nameSize: "text-[11px] sm:text-base",
    pointsSize: "mt-0.5 text-lg sm:text-2xl",
    step: "h-14 sm:h-20",
    width: "w-24 sm:w-40",
    overlap: "z-10 -mr-4 sm:-mr-7",
  },
  3: {
    label: "3° posto",
    points: "text-orange-300",
    ring: "border-orange-400",
    avatar: "h-14 w-14 sm:h-20 sm:w-20",
    medal: "h-6 w-6 sm:h-7 sm:w-7 -left-0.5 -top-0.5",
    nameSize: "text-[11px] sm:text-base",
    pointsSize: "mt-0.5 text-lg sm:text-xl",
    step: "h-11 sm:h-[3.75rem]",
    width: "w-24 sm:w-40",
    overlap: "z-10 -ml-4 sm:-ml-7",
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
    <div className="relative mb-4 overflow-hidden rounded-2xl border border-amber-400/15">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/podium-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,27,0.55)_0%,rgba(6,17,27,0.72)_55%,rgba(6,17,27,0.92)_100%)]" />

      {/* Stessa struttura a tre colonne su mobile e desktop: gruppo compatto e
          centrato, i gradini si toccano alla base come un podio vero. */}
      <div className="relative flex items-end justify-center gap-0 p-3 sm:py-6">
        {second ? (
          <PodiumColumn
            entry={second}
            place={2}
            isOwn={second.id === ownTeamId}
            onSelect={onSelect}
            className={`${PLACES[2].width} ${PLACES[2].overlap}`}
          />
        ) : null}
        {first ? (
          <PodiumColumn
            entry={first}
            place={1}
            isOwn={first.id === ownTeamId}
            onSelect={onSelect}
            className={`z-20 ${PLACES[1].width}`}
          />
        ) : null}
        {third ? (
          <PodiumColumn
            entry={third}
            place={3}
            isOwn={third.id === ownTeamId}
            onSelect={onSelect}
            className={`${PLACES[3].width} ${PLACES[3].overlap}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function PodiumColumn({
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
      className={`relative flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-1 pb-0 pt-2 text-center transition hover:-translate-y-0.5 sm:pt-3 ${className}`}
    >
      <span className="relative shrink-0">
        <UserAvatar
          name={owner.nickname}
          className={`border-[3px] bg-[#0F1E2E] shadow-[0_8px_20px_rgba(0,0,0,0.45)] ${style.ring} ${style.avatar} ${
            isOwn ? "ring-2 ring-[#22E6C3] ring-offset-2 ring-offset-[#06111B]" : ""
          }`}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/podium-${place}.png`}
          alt={style.label}
          className={`absolute object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.55)] ${style.medal}`}
        />
      </span>

      <span className={`max-w-full truncate font-black text-white ${style.nameSize}`}>
        {owner.nickname}
        {isOwn ? (
          <span className="ml-1 text-[9px] font-black uppercase tracking-wide text-[#3AF5D4] sm:ml-1.5 sm:text-[10px]">
            Tu
          </span>
        ) : null}
      </span>
      {owner.fullName ? (
        <span className="hidden max-w-full truncate text-xs text-zinc-500 sm:block">{owner.fullName}</span>
      ) : null}
      <span className={`font-black tabular-nums ${style.points} ${style.pointsSize}`}>
        {formatPoints(entry.points)}
        <span className="ml-1 text-[10px] font-bold text-zinc-500 sm:text-xs">pt</span>
      </span>
      {entry.prize ? (
        <span className="mt-0.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black text-amber-300 sm:px-2.5 sm:text-[11px]">
          Premio {formatMoney(entry.prize)}
        </span>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/podium-step-${place}.png`}
        alt=""
        aria-hidden="true"
        className={`mt-1.5 w-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.5)] sm:mt-3 ${style.step}`}
      />
    </button>
  );
}

function formatPoints(points: number) {
  return points.toLocaleString("it-IT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
