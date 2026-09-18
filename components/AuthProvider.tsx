"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { User } from "@/types/auth";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  /**
   * `false` durante SSR e al primo render del client. Chi decide redirect o
   * schermate "non autenticato" deve aspettare che diventi `true`, altrimenti
   * caccia fuori un utente che in realta ha la sessione valida in storage.
   */
  isReady: boolean;
  setAuth: (user: User, token: string, rememberMe?: boolean) => void;
  setUser: (user: User | null) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = "fantashot_auth_token";
const USER_STORAGE_KEY = "fantashot_auth_user";
const TOKEN_EXPIRY_KEY = "fantashot_auth_token_expiry";
const AUTH_CHANGED_EVENT = "fantashot_auth_changed";
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 giorni

type AuthSnapshot = {
  user: User | null;
  token: string | null;
  isReady: boolean;
};

/**
 * Snapshot usato dal server e dal primo render del client: essendo lo stesso
 * oggetto, l'HTML combacia e l'hydration non fallisce. Subito dopo React
 * rilegge lo store e passa ai dati veri.
 */
const SERVER_SNAPSHOT: AuthSnapshot = {
  user: null,
  token: null,
  isReady: false,
};

// getSnapshot deve restituire lo stesso riferimento finche i dati non cambiano,
// altrimenti React va in loop di render: teniamo in cache l'ultimo parse.
let cachedRawToken: string | null = null;
let cachedRawUser: string | null = null;
let cachedSnapshot: AuthSnapshot = {
  user: null,
  token: null,
  isReady: true,
};

/**
 * "Ricordami" attivo -> localStorage con scadenza a 30 giorni (sopravvive alla
 * chiusura del browser). Spento -> sessionStorage, muore con la tab.
 */
function readRaw(key: string): string | null {
  return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
}

function parseUser(raw: string | null): User | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function getSnapshot(): AuthSnapshot {
  const expiry = window.localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (expiry && Date.now() > Number(expiry)) {
    clearFromStorage();
  }

  const rawToken = readRaw(TOKEN_STORAGE_KEY);
  const rawUser = readRaw(USER_STORAGE_KEY);

  if (rawToken !== cachedRawToken || rawUser !== cachedRawUser) {
    cachedRawToken = rawToken;
    cachedRawUser = rawUser;
    cachedSnapshot = {
      token: rawToken,
      user: parseUser(rawUser),
      isReady: true,
    };
  }

  return cachedSnapshot;
}

function getServerSnapshot(): AuthSnapshot {
  return SERVER_SNAPSHOT;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AUTH_CHANGED_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AUTH_CHANGED_EVENT, onStoreChange);
  };
}

function notifyAuthChanged() {
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

function activeStorage(): Storage {
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
    ? window.localStorage
    : window.sessionStorage;
}

function saveToStorage(user: User, token: string, rememberMe: boolean): void {
  clearFromStorage();

  const storage = rememberMe ? window.localStorage : window.sessionStorage;
  storage.setItem(TOKEN_STORAGE_KEY, token);
  storage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

  if (rememberMe) {
    window.localStorage.setItem(
      TOKEN_EXPIRY_KEY,
      String(Date.now() + REMEMBER_ME_DURATION)
    );
  }
}

function clearFromStorage(): void {
  for (const key of [TOKEN_STORAGE_KEY, USER_STORAGE_KEY, TOKEN_EXPIRY_KEY]) {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const setAuth = useCallback(
    (nextUser: User, nextToken: string, rememberMe: boolean = false) => {
      saveToStorage(nextUser, nextToken, rememberMe);
      notifyAuthChanged();
    },
    []
  );

  const setUser = useCallback((nextUser: User | null) => {
    if (!nextUser) {
      activeStorage().removeItem(USER_STORAGE_KEY);
    } else {
      activeStorage().setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    }

    notifyAuthChanged();
  }, []);

  const clearAuth = useCallback(() => {
    clearFromStorage();
    notifyAuthChanged();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: snapshot.user,
      token: snapshot.token,
      isAuthenticated: Boolean(snapshot.token),
      isReady: snapshot.isReady,
      setAuth,
      setUser,
      clearAuth,
    }),
    [snapshot, setAuth, setUser, clearAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
