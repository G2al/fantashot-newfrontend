"use client";

import { useState } from "react";
import type { FantaTeamFormationEntry } from "@/types/tournament";

type FormationData = Record<string, FantaTeamFormationEntry>;

export type SubstitutionPair = {
  out: FantaTeamFormationEntry;
  in: FantaTeamFormationEntry;
};

export type SubstitutionContext = {
  role: "in" | "out";
  partner: FantaTeamFormationEntry;
};

/** Coppie "esce titolare -> entra riserva", ricostruite da substitution.with_id (= fanta_lineup_id dell'altro). */
export function getSubstitutionPairs(formationData: FormationData): SubstitutionPair[] {
  const entries = Object.values(formationData);

  return entries.flatMap((entry) => {
    if (entry.substitution?.status !== "out") return [];

    const replacement = entries.find(
      (candidate) => candidate.fanta_lineup_id === entry.substitution?.with_id,
    );

    return replacement ? [{ out: entry, in: replacement }] : [];
  });
}

/** L'altro giocatore della sostituzione in cui e' coinvolto `entry`, se c'e'. */
export function getSubstitutionContext(
  formationData: FormationData,
  entry: FantaTeamFormationEntry | null | undefined,
): SubstitutionContext | null {
  if (!entry?.substitution) return null;

  const partner = Object.values(formationData).find(
    (candidate) => candidate.fanta_lineup_id === entry.substitution?.with_id,
  );

  return partner ? { role: entry.substitution.status, partner } : null;
}

export function SubstitutionsPanel({
  formationData,
  onInspect,
}: {
  formationData: FormationData;
  onInspect?: (entry: FantaTeamFormationEntry) => void;
}) {
  const pairs = getSubstitutionPairs(formationData);

  if (!pairs.length) return null;

  return (
    <section className="mx-3 mb-3 rounded-xl border border-[#1D6D68]/50 bg-[#06111B]/85 p-3 backdrop-blur-sm sm:mx-auto sm:mb-4 sm:max-w-[calc(100%-2.5rem)] sm:p-4">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-white">
        <span className="text-[#22E6C3]">
          <SwapIcon />
        </span>
        Sostituzioni
        <span className="text-zinc-500">{pairs.length}</span>
      </p>

      <ul className="space-y-2">
        {pairs.map((pair) => (
          <li
            key={`${pair.out.fanta_lineup_id}-${pair.in.fanta_lineup_id}`}
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-2 rounded-lg border border-white/10 bg-[#0F1E2E]/80 p-2.5 sm:gap-4 sm:p-3"
          >
            <PlayerSide entry={pair.out} tone="out" onInspect={onInspect} />
            <span className="mt-3 text-zinc-500" aria-hidden="true">
              <ArrowRightIcon />
            </span>
            <PlayerSide entry={pair.in} tone="in" onInspect={onInspect} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlayerSide({
  entry,
  tone,
  onInspect,
}: {
  entry: FantaTeamFormationEntry;
  tone: "in" | "out";
  onInspect?: (entry: FantaTeamFormationEntry) => void;
}) {
  const isOut = tone === "out";
  const total = typeof entry.total_points === "number" ? entry.total_points : entry.points;

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={() => onInspect?.(entry)}
        disabled={!onInspect}
        className="flex w-full min-w-0 items-center gap-2 text-left disabled:cursor-default"
      >
        <span
          className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-[#06111B] ${
            isOut ? "border-red-500/60" : "border-green-500"
          }`}
        >
          {entry.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.avatar}
              alt=""
              className={`h-full w-full object-cover ${isOut ? "opacity-40 grayscale" : ""}`}
            />
          ) : null}
        </span>
        <span className="min-w-0">
          <span
            className={`block truncate text-xs font-black sm:text-sm ${
              isOut ? "text-zinc-400 line-through decoration-zinc-600" : "text-white"
            }`}
          >
            {entry.name}
          </span>
          <span
            className={`block text-[10px] font-black uppercase tracking-wide ${
              isOut ? "text-red-400" : "text-green-400"
            }`}
          >
            {isOut ? "Esce" : "Entra"}
          </span>
        </span>
      </button>

      <div className="mt-1.5">
        {isOut ? (
          <NotPlayedInfo />
        ) : (
          <span className="inline-flex rounded-full border border-[#22E6C3]/35 bg-[#123A3B]/90 px-2 py-0.5 text-[10px] font-black text-[#3AF5D4]">
            {formatPoints(total)} pt · {entry.minutes_played}&apos;
          </span>
        )}
      </div>
    </div>
  );
}

/** "Non ha giocato" con tendina che spiega la regola dei 15 minuti. */
export function NotPlayedInfo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1 rounded-full border border-zinc-600 bg-zinc-800/90 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-300"
      >
        Non ha giocato
        <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-zinc-600 text-[9px] leading-none text-white">
          i
        </span>
      </button>
      {isOpen ? (
        <p className="mt-1.5 rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 text-[11px] font-medium leading-snug text-zinc-300">
          Un giocatore risulta &quot;non giocato&quot; se scende in campo per meno di 15 minuti. Da 15 minuti in
          su prende voto e i suoi punti contano.
        </p>
      ) : null}
    </div>
  );
}

/** Nel dettaglio giocatore: chi lo ha sostituito o chi ha sostituito lui. */
export function SubstitutionLink({
  context,
  onOpenPartner,
}: {
  context: SubstitutionContext;
  onOpenPartner?: (entry: FantaTeamFormationEntry) => void;
}) {
  const { role, partner } = context;
  const isOut = role === "out";

  return (
    <div className="mb-4 rounded-xl border border-[#1E3448] bg-[#101D2C] p-3">
      <p
        className={`mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide ${
          isOut ? "text-red-400" : "text-green-400"
        }`}
      >
        <span
          className={`grid h-4 w-4 place-items-center rounded-full ${
            isOut ? "bg-red-500 text-white" : "bg-green-500 text-[#06111B]"
          }`}
        >
          <ArrowIcon direction={isOut ? "down" : "up"} />
        </span>
        {isOut ? "Sostituito da" : "Entrato al posto di"}
      </p>

      <button
        type="button"
        onClick={() => onOpenPartner?.(partner)}
        disabled={!onOpenPartner}
        className="flex w-full items-center gap-3 rounded-lg text-left transition hover:bg-white/[0.03] disabled:cursor-default"
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full border-2 bg-[#06111B] ${
            isOut ? "border-green-500" : "border-red-500/60"
          }`}
        >
          {partner.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.avatar}
              alt=""
              className={`h-full w-full object-cover ${isOut ? "" : "opacity-40 grayscale"}`}
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-white">{partner.name}</span>
          <span className="block text-[11px] text-zinc-500">
            {partner.minutes_played}&apos; giocati
          </span>
        </span>
        <span className="text-xs font-black text-[#3AF5D4]">Vedi →</span>
      </button>

      {isOut ? (
        <div className="mt-2 border-t border-white/10 pt-2">
          <NotPlayedInfo />
        </div>
      ) : null}
    </div>
  );
}

function formatPoints(points: number) {
  return points.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      className="h-2.5 w-2.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "up" ? <path d="M12 19V5M5 12l7-7 7 7" /> : <path d="M12 5v14M5 12l7 7 7-7" />}
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
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
      <path d="M7 4v14M3 14l4 4 4-4M17 20V6M13 10l4-4 4 4" />
    </svg>
  );
}
