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
 * la stessa gerarchia visiva di un podio vero.
 */
const PLACES = {
  1: {
    label: "Vincitore",
    points: "text-amber-300",
    ring: "border-amber-400",
    avatar: "h-24 w-24 sm:h-28 sm:w-28",
    medal: "h-9 w-9 sm:h-11 sm:w-11 -left-1 -top-1 sm:-left-2 sm:-top-2",
    nameSize: "text-lg sm:text-xl",
    pointsSize: "mt-1 text-3xl sm:text-4xl",
    step: "h-24 sm:h-32",
  },
  2: {
    label: "2° posto",
    points: "text-zinc-200",
    ring: "border-zinc-300",
    avatar: "h-20 w-20 sm:h-24 sm:w-24",
    medal: "h-7 w-7 sm:h-9 sm:w-9 -left-1 -top-1",
    nameSize: "text-sm sm:text-base",
    pointsSize: "mt-0.5 text-2xl",
    step: "h-16 sm:h-20",
  },
  3: {
    label: "3° posto",
    points: "text-orange-300",
    ring: "border-orange-400",
    avatar: "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20",
    medal: "h-6 w-6 sm:h-7 sm:w-7 -left-0.5 -top-0.5",
    nameSize: "text-sm sm:text-base",
    pointsSize: "mt-0.5 text-xl sm:text-2xl",
    step: "h-12 sm:h-[3.75rem]",
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

      {/* Mobile: griglia, vincitore sopra a tutta larghezza (invariato). */}
      <div className="relative grid grid-cols-2 items-end gap-3 p-4 sm:hidden">
        {first ? (
          <PodiumColumn
            entry={first}
            place={1}
            isOwn={first.id === ownTeamId}
            onSelect={onSelect}
            className="col-span-2 w-full"
          />
        ) : null}
        {second ? (
          <PodiumColumn entry={second} place={2} isOwn={second.id === ownTeamId} onSelect={onSelect} className="w-full" />
        ) : null}
        {third ? (
          <PodiumColumn entry={third} place={3} isOwn={third.id === ownTeamId} onSelect={onSelect} className="w-full" />
        ) : null}
      </div>

      {/* Desktop: gruppo compatto e centrato, i gradini si toccano come un podio vero
          invece di occupare ciascuno un terzo della larghezza del pannello. */}
      <div className="relative hidden items-end justify-center py-6 sm:flex">
        {second ? (
          <PodiumColumn
            entry={second}
            place={2}
            isOwn={second.id === ownTeamId}
            onSelect={onSelect}
            className="z-10 w-40 -mr-3"
          />
        ) : null}
        {first ? (
          <PodiumColumn
            entry={first}
            place={1}
            isOwn={first.id === ownTeamId}
            onSelect={onSelect}
            className="z-20 w-48"
          />
        ) : null}
        {third ? (
          <PodiumColumn
            entry={third}
            place={3}
            isOwn={third.id === ownTeamId}
            onSelect={onSelect}
            className="z-10 w-40 -ml-3"
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
      className={`relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 pb-0 pt-3 text-center transition hover:-translate-y-0.5 ${className}`}
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
          <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide text-[#3AF5D4]">Tu</span>
        ) : null}
      </span>
      {owner.fullName ? (
        <span className="max-w-full truncate text-xs text-zinc-500">{owner.fullName}</span>
      ) : null}
      <span className={`font-black tabular-nums ${style.points} ${style.pointsSize}`}>
        {formatPoints(entry.points)}
        <span className="ml-1 text-xs font-bold text-zinc-500">pt</span>
      </span>
      {entry.prize ? (
        <span className="mt-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-[11px] font-black text-amber-300">
          Premio {formatMoney(entry.prize)}
        </span>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/podium-step-${place}.png`}
        alt=""
        aria-hidden="true"
        className={`mt-3 w-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.5)] ${style.step}`}
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
