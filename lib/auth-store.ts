import { ApiError } from "@/lib/api";
import { getMe } from "@/lib/auth-api";
import type { User } from "@/types/auth";

const TOKEN = "fantashot_auth_token";
const USER = "fantashot_auth_user";
const EXPIRY = "fantashot_auth_token_expiry";
const PARTNER = "fantashot_auth_partner";
const KEYS = [TOKEN, USER, EXPIRY, PARTNER];
const PARTNER_EXPIRED = "Sessione partner non valida o scaduta. Riapri Fantashot dall’app partner per ottenere una nuova sessione.";

type Snapshot = {
  user: User | null;
  token: string | null;
  isReady: boolean;
  error: string | null;
  memoryOnly: boolean;
  partner: boolean;
  launchNavigation: boolean;
};
const SERVER: Snapshot = {
  user: null, token: null, isReady: false, error: null,
  memoryOnly: false, partner: false, launchNavigation: false,
};
let snapshot = SERVER;
let initialized = false;
let generation = 0;
let remembered = false;
const listeners = new Set<() => void>();
export const getAuthSnapshot = () => snapshot;
export const getServerAuthSnapshot = () => SERVER;
export const getAuthRevision = () => generation;

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

function storage(kind: "localStorage" | "sessionStorage"): Storage | null {
  try { return window[kind]; } catch { return null; }
}
function read(target: Storage | null, key: string) {
  try { return target?.getItem(key) ?? null; } catch { return null; }
}
function removeStoredAuth() {
  for (const kind of ["localStorage", "sessionStorage"] as const) {
    const target = storage(kind);
    for (const key of KEYS) {
      try { target?.removeItem(key); } catch { /* Memory remains authoritative. */ }
    }
  }
}
function persist(user: User, token: string, rememberMe: boolean, partner: boolean) {
  removeStoredAuth();
  const target = storage(rememberMe ? "localStorage" : "sessionStorage");
  try {
    if (!target) return false;
    target.setItem(TOKEN, token);
    target.setItem(USER, JSON.stringify(user));
    target.setItem(PARTNER, String(partner));
    if (rememberMe) target.setItem(EXPIRY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    return target.getItem(TOKEN) === token;
  } catch {
    removeStoredAuth();
    return false;
  }
}

export function setAuth(user: User, token: string, rememberMe = false) {
  generation++;
  initialized = true;
  remembered = rememberMe;
  const memoryOnly = !persist(user, token, rememberMe, snapshot.partner);
  publish({ user, token, isReady: true, error: null, memoryOnly });
}
export function setUser(user: User | null) {
  if (!snapshot.token) return;
  if (!snapshot.memoryOnly) {
    try {
      const target = storage(remembered ? "localStorage" : "sessionStorage");
      if (!target) throw new Error("Storage unavailable");
      if (user) target.setItem(USER, JSON.stringify(user));
      else target.removeItem(USER);
    } catch { publish({ memoryOnly: true }); }
  }
  publish({ user });
}
export function clearAuth() {
  generation++;
  initialized = true;
  removeStoredAuth();
  publish({ ...SERVER, isReady: true });
}
export function consumeLaunchNavigation() {
  if (!snapshot.launchNavigation) return false;
  publish({ launchNavigation: false });
  return true;
}

async function verify(token: string, partner: boolean, launch: boolean) {
  const current = ++generation;
  publish({ ...SERVER, partner });
  try {
    const { user, wallets } = await getMe(token);
    // A new URL token always wins, even if navigation and resolution coincide.
    initializeAuth();
    if (current !== generation) return;
    if (!user || !Array.isArray(wallets)) throw new Error("Invalid profile response");
    if (launch) {
      setAuth({ ...user, wallets }, token, false);
      publish({ launchNavigation: true });
    } else {
      // Restoring storage does not renew the token or the Remember me expiry.
      publish({ user: { ...user, wallets }, token, isReady: true });
    }
  } catch (error) {
    initializeAuth();
    if (current !== generation) return;
    removeStoredAuth();
    const unauthorized = error instanceof ApiError && error.status === 401;
    publish({
      ...SERVER, isReady: true, partner,
      error: unauthorized
        ? partner ? PARTNER_EXPIRED : "Sessione scaduta. Accedi di nuovo con email e password."
        : "Impossibile verificare l’accesso. Controlla la connessione e riapri Fantashot dall’app partner oppure accedi di nuovo. Se il problema persiste, riprova più tardi.",
    });
  }
}

export function initializeAuth() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("token")) {
    const token = params.get("token") ?? "";
    params.delete("token");
    const query = params.toString();
    // Let Next synchronize useSearchParams; passing its internal state bypasses that.
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    initialized = true;
    removeStoredAuth();
    void verify(token, true, true);
    return;
  }
  if (initialized) return;
  initialized = true;
  const session = storage("sessionStorage");
  const local = storage("localStorage");
  const sessionToken = read(session, TOKEN);
  const token = sessionToken ?? read(local, TOKEN);
  remembered = !sessionToken;
  const expiry = remembered ? read(local, EXPIRY) : null;
  if (expiry && Date.now() > Number(expiry)) {
    clearAuth();
    return;
  }
  if (token) void verify(token, read(sessionToken ? session : local, PARTNER) === "true", false);
  else publish({ ...SERVER, isReady: true });
}

function onUnauthorized(event: Event) {
  const token = (event as CustomEvent<string>).detail;
  if (!token || token !== snapshot.token) return;
  const partner = snapshot.partner;
  clearAuth();
  publish({ partner, error: partner ? PARTNER_EXPIRED : "Sessione scaduta. Accedi di nuovo con email e password." });
}
function onStorage(event: StorageEvent) {
  if (event.key !== null && !KEYS.includes(event.key)) return;
  generation++;
  initialized = false;
  initializeAuth();
}
export function subscribeAuth(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("fantashot_unauthorized", onUnauthorized);
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("fantashot_unauthorized", onUnauthorized);
      window.removeEventListener("storage", onStorage);
    }
  };
}
