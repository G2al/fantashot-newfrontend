"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getMe, logout } from "@/lib/auth-api";
import { UserAvatar } from "@/components/UserAvatar";
import type { Wallet } from "@/types/auth";

/**
 * Solo header, niente sidebar: in Fantashot un torneo copre piu' campionati
 * insieme (vedi LobbyFiltersProvider), quindi un albero di navigazione
 * paese->campionato->tornei non ha un modello dati a cui appoggiarsi. La
 * navigazione per campionato/paese vive come tag selezionabili dentro la
 * lobby stessa, non qui.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, token, isAuthenticated, isReady, setUser, clearAuth } =
    useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    function closeOnOutsideClick(event: PointerEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsProfileMenuOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    if (!token || user?.wallets) {
      return;
    }

    let isActive = true;

    void Promise.resolve()
      .then(() => getMe(token))
      .then(({ user: currentUser, wallets }) => {
        if (isActive) {
          setUser({ ...currentUser, wallets });
        }
      })
      .catch(() => {
        // Il profilo base ricevuto da login/register resta comunque
        // utilizzabile anche se questo refresh fallisce.
      });

    return () => {
      isActive = false;
    };
  }, [setUser, token, user?.wallets]);

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06111B]">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#1ED8B7]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      if (token) {
        await logout(token);
      }
    } catch {
      // La sessione locale va chiusa anche se la revoca remota non risponde.
    } finally {
      clearAuth();
      setIsLoggingOut(false);
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-[#06111B] text-zinc-50">
      <header className="relative z-40 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#06111B]/95 px-4 backdrop-blur sm:px-6">
        <Link href="/dashboard" aria-label="Vai alla dashboard" className="relative block h-9 w-32 sm:w-36">
          {/* eslint-disable-next-line @next/next/no-img-element -- asset di brand sostituito spesso durante lo sviluppo: la cache dell'ottimizzatore next/image intrappolava versioni vecchie */}
          <img
            src="/images/logo-fantashot.png"
            alt="Fantashot"
            className="h-full w-full object-contain object-left"
          />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="flex h-10 items-center gap-1.5 rounded-full border border-white/10 bg-[#0F1E2E] px-2 text-[11px] font-bold text-white sm:gap-2 sm:px-3 sm:text-sm"
            aria-label={`Saldo wallet: ${formatWalletTotal(user?.wallets)}`}
          >
            <span className="text-[#22E6C3]">
              <WalletIcon />
            </span>
            <span className="whitespace-nowrap">{formatWalletTotal(user?.wallets)}</span>
          </div>

          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((current) => !current)}
              className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-[#0F1E2E] pl-1 pr-3 transition hover:border-[#22E6C3]/40"
              aria-label="Menu profilo"
              aria-expanded={isProfileMenuOpen}
            >
              <UserAvatar name={user?.name ?? "Fantashot"} className="h-9 w-9 text-sm" />
              <span className={`text-zinc-400 transition ${isProfileMenuOpen ? "rotate-180" : ""}`}>
                <ChevronDownIcon />
              </span>
            </button>

            {isProfileMenuOpen ? (
              <div className="absolute right-0 top-[52px] z-30 w-56 rounded-lg border border-white/10 bg-[#0F1E2E] p-2 shadow-2xl">
                <div className="border-b border-white/8 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-zinc-100">
                    {user?.name ?? "Utente"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="mt-1 w-full rounded-md px-3 py-2 text-left text-sm text-[#E9FFFA] transition hover:bg-[#22E6C3]/10 disabled:opacity-60"
                >
                  {isLoggingOut ? "Uscita..." : "Esci"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

function formatWalletTotal(wallets?: Wallet[]) {
  if (!wallets?.length) {
    return "0,00 EUR";
  }

  const currency = wallets[0].balance.currency;
  const decimals = wallets[0].balance.decimal_places;
  const total = wallets.reduce(
    (sum, wallet) => sum + Number(wallet.balance.amount),
    0
  );

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(total / 10 ** decimals);
}

function ChevronDownIcon() {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function WalletIcon() {
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
      <path d="M19 7V6a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a3 3 0 0 1-3-3V7" />
      <path d="M16 14h.01" />
    </svg>
  );
}
