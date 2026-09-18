import { apiFetch } from "@/lib/api";
import type {
  LoginPayload,
  LoginResponse,
  MeResponse,
  RegisterPayload,
  RegisterResponse,
} from "@/types/auth";

export function register(payload: RegisterPayload) {
  return apiFetch<RegisterResponse>("/register", {
    method: "POST",
    body: payload,
  });
}

/**
 * A differenza del register, qui il backend restituisce solo il token - i
 * dati utente (e il wallet) si prendono con una chiamata separata a /me.
 */
export function login(payload: LoginPayload) {
  return apiFetch<LoginResponse>("/login", {
    method: "POST",
    body: payload,
  });
}

/**
 * La risposta vera avvolge tutto in un campo "data" in piu, non documentato
 * nella specifica iniziale - verificato leggendo la risposta reale in
 * devtools il 2026-09-17.
 */
export async function getMe(token: string) {
  const response = await apiFetch<{ data: MeResponse }>("/me", { token });
  return response.data;
}

export function logout(token: string) {
  return apiFetch<{ message: string }>("/logout", {
    method: "POST",
    token,
  });
}
