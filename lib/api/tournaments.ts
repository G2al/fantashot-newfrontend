import { apiFetch } from "@/lib/api";
import type {
  LineupPayload,
  PaginatedResponse,
  Tournament,
  TournamentDetail,
  TournamentRankingEntry,
  TournamentTeamDetails,
} from "@/types/tournament";


/**
 * Pubblico, non serve token - ma se c'e' lo mandiamo comunque: e' quello che
 * fa scattare `is_user_registered` a riflettere lo stato vero dell'utente
 * invece di restare sempre false.
 */
export async function getTournamentsPage(page: number, token?: string | null) {
  return apiFetch<PaginatedResponse<Tournament>>(`/tournaments?page=${page}`, {
    token: token ?? undefined,
  });
}

/**
 * L'endpoint pagina lato server (15 per pagina), ma la sidebar paesi/leghe e
 * i filtri per campionato hanno bisogno di vedere TUTTI i tornei insieme,
 * non solo la pagina corrente - il backend non offre un filtro per lega su
 * cui appoggiarsi. Si scaricano quindi tutte le pagine una volta sola e si
 * filtra/raggruppa tutto lato client, esattamente come in survivor-fe.
 * Va rivisto se il catalogo tornei crescesse molto: a quel punto conviene
 * chiedere al backend un filtro per lega/paese lato server.
 */
export async function getAllTournaments(token?: string | null) {
  const firstPage = await getTournamentsPage(1, token);
  const remainingPages = Array.from(
    { length: Math.max(0, firstPage.meta.last_page - 1) },
    (_, index) => getTournamentsPage(index + 2, token),
  );
  const responses = await Promise.all(remainingPages);
  const pages = [firstPage.data, ...responses.map((response) => response.data)];

  return pages.flat();
}

/** Endpoint al singolare ("tournament", non "tournaments") - errore facile. */
export async function getTournament(id: number, token?: string | null) {
  const response = await apiFetch<{ data: TournamentDetail }>(
    `/tournament/${id}`,
    { token: token ?? undefined },
  );

  return response.data;
}

/**
 * 403 con "Tournament has not started yet" finche' il torneo non e'
 * in-progress/finished/paid - il chiamante deve gestire quell'errore
 * separatamente per mostrare un messaggio dedicato invece di uno generico.
 */
export async function getTournamentTeamDetails(
  tournamentId: number,
  teamId: number,
  token?: string | null
) {
  const response = await apiFetch<{ data: TournamentTeamDetails }>(
    `/tournaments/${tournamentId}/fantateams/${teamId}/details`,
    { token: token ?? undefined }
  );

  return response.data;
}

/** Pubblico, gia' ordinato per points decrescente lato server. */
export async function getTournamentRanking(id: number, token?: string | null) {
  const response = await apiFetch<{ data: TournamentRankingEntry[] }>(
    `/tournaments/${id}/ranking`,
    { token: token ?? undefined },
  );

  return response.data;
}

export type SubscribeResponse = {
  message: string;
  fanta_team_id: number;
  lineup_created: boolean;
};

/**
 * Iscrizione e formazione sono un'unica azione atomica: non esiste un modo
 * per iscriversi "vuoto" e completare dopo. Scala il saldo dal wallet
 * Default appena la richiesta va a buon fine.
 */
export function subscribeToTournament(
  id: number,
  payload: LineupPayload,
  token: string
) {
  return apiFetch<SubscribeResponse>(`/tournaments/${id}/subscribe`, {
    method: "POST",
    token,
    body: payload,
  });
}

/**
 * Sovrascrive completamente la formazione precedente (nessun limite al
 * numero di volte, finche' siamo prima di enrollments_end_date e il torneo
 * e' ancora in stato "enrollments").
 */
export function updateTournamentTeam(
  id: number,
  payload: LineupPayload,
  token: string
) {
  return apiFetch<SubscribeResponse>(`/tournaments/${id}/update-team`, {
    method: "PUT",
    token,
    body: payload,
  });
}
