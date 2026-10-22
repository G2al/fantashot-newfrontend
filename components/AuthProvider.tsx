"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Suspense, createContext, useContext, useEffect, useLayoutEffect,
  useMemo, useSyncExternalStore, type ReactNode,
} from "react";
import {
  clearAuth, consumeLaunchNavigation, getAuthRevision, getAuthSnapshot, getServerAuthSnapshot,
  initializeAuth, setAuth, setUser, subscribeAuth,
} from "@/lib/auth-store";
import type { User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isReady: boolean;
  setAuth: (user: User, token: string, rememberMe?: boolean) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthWaiting() {
  return (
    <div role="status" aria-label="Verifica accesso in corso" className="flex min-h-screen items-center justify-center bg-[#06111B]">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#1ED8B7]" />
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AuthWaiting />}><AuthSession>{children}</AuthSession></Suspense>;
}

function AuthSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const snapshot = useSyncExternalStore(subscribeAuth, getAuthSnapshot, getServerAuthSnapshot);
  // Block children before their authentication/redirect effects can run.
  const hasLaunchToken = searchParams.has("token");
  useLayoutEffect(() => { initializeAuth(); }, [searchParams]);

  useEffect(() => {
    if (snapshot.launchNavigation && !hasLaunchToken && consumeLaunchNavigation()) {
      router.replace(`/dashboard${window.location.search}${window.location.hash}`);
    }
  }, [snapshot.launchNavigation, hasLaunchToken, router]);

  const value = useMemo<AuthContextValue>(() => {
    const revision = getAuthRevision();
    // Async login, wallet updates and logout from an old tree cannot mutate B.
    const current = () => revision === getAuthRevision() && !new URLSearchParams(window.location.search).has("token");
    return {
      user: snapshot.user, token: snapshot.token,
      isAuthenticated: Boolean(snapshot.token), isReady: snapshot.isReady,
      setAuth: (user, token, rememberMe) => { if (current()) setAuth(user, token, rememberMe); },
      setUser: (user) => { if (current()) setUser(user); },
      clearAuth: () => { if (current()) clearAuth(); },
    };
  }, [snapshot]);

  if (hasLaunchToken || !snapshot.isReady) return <AuthWaiting />;
  if (snapshot.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06111B] px-5">
        <div className="w-full max-w-md space-y-5 rounded-lg border border-white/10 bg-[#0F1E2E] p-5 sm:p-6">
          <p role="alert" className="rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-200">{snapshot.error}</p>
          <button type="button" onClick={() => { clearAuth(); router.replace("/login"); }} className="block w-full rounded-lg bg-[#22E6C3] px-4 py-3 text-sm font-bold text-[#06111B]">
            Vai al login email e password
          </button>
        </div>
      </div>
    );
  }
  return (
    <AuthContext.Provider value={value}>
      {snapshot.memoryOnly && snapshot.token ? (
        <p role="status" className="bg-[#0F1E2E] px-4 py-3 text-sm text-[#B7C6D6]">
          Lo storage del browser non è disponibile. Al reload dovrai riaprire Fantashot dall’app partner o accedere di nuovo.
        </p>
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
