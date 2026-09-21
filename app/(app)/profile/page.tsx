"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MovementsPanel } from "@/components/profile/MovementsPanel";
import { MyTournaments, getGroup } from "@/components/profile/MyTournaments";
import { getUserResult } from "@/components/TournamentCard";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/hooks/use-auth";
import { getAllTournaments } from "@/lib/api/tournaments";
import { getApiDateTimeMs } from "@/lib/date-time";
import { formatMoney } from "@/lib/format";
import { getWalletBalanceMinor } from "@/lib/wallet";
import type { Tournament } from "@/types/tournament";

type Tab = "tornei" | "movimenti";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "tornei", label: "I miei tornei" },
  { id: "movimenti", label: "Movimenti" },
];

export default function ProfilePage() {
  const { user, token } = useAuth();
  const [tab, setTab] = useState<Tab>("tornei");
  const [tournaments, setTournaments] = useState<Tournament[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;

    let isActive = true;

    void Promise.resolve()
      .then(() => getAllTournaments(token))
      .then((data) => {
        if (!isActive) return;
        setTournaments(data.filter((tournament) => tournament.is_user_registered));
        setError(false);
      })
      .catch(() => {
        if (isActive) setError(true);
      });

    return () => {
      isActive = false;
    };
  }, [token, attempt]);

  const wallet = user?.wallets?.[0];
  const balance = getWalletBalanceMinor(user?.wallets);
  const stats = computeStats(tournaments ?? [], user?.id);
  const memberSince = user?.created_at
    ? new Date(getApiDateTimeMs(user.created_at)).toLocaleDateString("it-IT", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl py-2 lg:py-4">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#3AF5D4] transition hover:text-[#E9FFFA]"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Torna ai tornei
      </Link>

      <section className="relative mt-4 overflow-hidden rounded-2xl border border-[#1E3448] bg-[#0F1E2E] sm:border-[#22E6C3]/25">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner-torneo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,27,0.85)_0%,rgba(6,17,27,0.6)_100%)]" />

        <div className="relative grid gap-5 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar
              name={user?.name ?? "Fantashot"}
              className="h-16 w-16 border-2 border-[#22E6C3] text-xl sm:h-20 sm:w-20 sm:text-2xl"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#1ED8B7]">Il tuo profilo</p>
              <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                {user?.username ? `@${user.username}` : (user?.name ?? "Utente")}
              </h1>
              <p className="truncate text-sm text-zinc-400">
                {user?.name}
                {user?.email ? ` · ${user.email}` : ""}
              </p>
              {memberSince ? (
                <p className="mt-0.5 text-xs text-zinc-500">Iscritto da {memberSince}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#06111B]/85 px-5 py-4 backdrop-blur md:min-w-[240px]">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">
              <span className="text-[#22E6C3]">
                <WalletIcon />
              </span>
              Saldo disponibile
            </p>
            <p className="mt-1 text-3xl font-black tabular-nums text-white">
              {wallet && balance !== null
                ? formatMoney({
                    amount: balance,
                    currency: wallet.balance.currency,
                    decimal_places: wallet.balance.decimal_places,
                  })
                : "—"}
            </p>
            {user?.wallets && user.wallets.length > 1 ? (
              <ul className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-xs text-zinc-400">
                {user.wallets.map((item) => (
                  <li key={item.slug} className="flex justify-between gap-3">
                    <span className="truncate">{item.name}</span>
                    <span className="font-bold text-zinc-200">
                      {formatMoney({
                        amount: Number(item.balance.amount),
                        currency: item.balance.currency,
                        decimal_places: item.balance.decimal_places,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Tornei giocati" value={String(stats.played)} loading={!tournaments} />
        <StatCard label="In corso o aperti" value={String(stats.active)} loading={!tournaments} />
        <StatCard label="Vittorie" value={String(stats.wins)} loading={!tournaments} highlight={stats.wins > 0} />
        <StatCard
          label="Premi vinti"
          value={stats.prizes === null ? "—" : formatMoney(stats.prizes)}
          loading={!tournaments}
        />
      </div>

      <div className="mt-5 flex gap-1 rounded-xl border border-[#1E3448] bg-[#0A1420] p-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`h-11 flex-1 rounded-lg text-xs font-black uppercase tracking-wide transition sm:text-sm ${
              tab === item.id
                ? "bg-[#22E6C3] text-[#06111B] shadow-[0_8px_24px_rgba(34,230,195,0.25)]"
                : "text-zinc-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "movimenti" ? (
          <MovementsPanel />
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-950/35 px-5 py-6 text-center">
            <p className="text-sm font-bold text-red-200">Impossibile caricare i tuoi tornei.</p>
            <button
              type="button"
              onClick={() => {
                setError(false);
                setAttempt((current) => current + 1);
              }}
              className="mt-3 h-10 rounded-lg border border-red-400/40 px-4 text-xs font-black uppercase tracking-wide text-red-200"
            >
              Riprova
            </button>
          </div>
        ) : !tournaments ? (
          <div className="space-y-2.5" aria-label="Caricamento tornei">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-24 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : (
          <MyTournaments tournaments={tournaments} userId={user?.id} />
        )}
      </div>
    </div>
  );
}

function computeStats(tournaments: Tournament[], userId: number | undefined) {
  const isFinal = (tournament: Tournament) => ["finished", "paid"].includes(tournament.status);
  const won = tournaments.filter((tournament) => {
    if (!isFinal(tournament)) return false;
    const result = getUserResult(tournament);
    return result
      ? result.position === 1
      : Boolean(tournament.winner && userId && tournament.winner.user.id === userId);
  });
  // Premi davvero pagati (user_prize e' valorizzato solo per tornei "paid").
  const paidPrizes = tournaments.flatMap((tournament) => {
    const prize = getUserResult(tournament)?.prize;
    return prize ? [prize] : [];
  });

  return {
    played: tournaments.length,
    active: tournaments.filter((tournament) => getGroup(tournament) !== "closed").length,
    wins: won.length,
    prizes: paidPrizes.length
      ? { ...paidPrizes[0], amount: paidPrizes.reduce((sum, prize) => sum + prize.amount, 0) }
      : null,
  };
}

function StatCard({
  label,
  value,
  loading,
  highlight = false,
}: {
  label: string;
  value: string;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1E2E]/88 px-4 py-3.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-7 w-16 animate-pulse rounded bg-white/10" />
      ) : (
        <p className={`mt-0.5 truncate text-2xl font-black tabular-nums ${highlight ? "text-amber-300" : "text-white"}`}>
          {value}
        </p>
      )}
    </div>
  );
}

function WalletIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="14" rx="3" />
      <path d="M2 10h20M16 15h2" />
    </svg>
  );
}
