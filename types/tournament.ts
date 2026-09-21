export type Money = {
  amount: number;
  currency: string;
  decimal_places: number;
};

export type Country = {
  id: number;
  name: string;
  iso2: string;
  flag: string;
};

export type League = {
  id: number;
  name: string;
  logo: string;
  /** Il backend puo restituire null per leghe importate senza paese. */
  country: Country | null;
};

/**
 * Valori reali confermati dal backend (2026-09-17). Alcuni (draft, ready)
 * probabilmente non compaiono mai sull'endpoint pubblico, ma li gestiamo
 * comunque per non lasciare una card senza badge se dovessero arrivare.
 */
export type TournamentStatus =
  | "draft"
  | "ready"
  | "enrollments"
  | "waiting-for-start"
  | "in-progress"
  | "finished"
  | "paid"
  | "cancelled";

export type Tournament = {
  id: number;
  uuid: string;
  title: string;
  description: string;
  status: TournamentStatus;
  buy_in: Money;
  prize_pool: Money;
  enrolled_users_count: number;
  is_user_registered: boolean;
  enrollments_end_date: string;
  min_participants: number;
  max_participants: number;
  created_at: string;
  updated_at: string;
  /** Vuoto finche' non hanno fixture assegnate. Puo' contenerne piu' di una. */
  leagues: League[];
  /** Null se il torneo non ha una copertina caricata da Filament. */
  cover_image_url: string | null;
};

export type TournamentModuleSchema = Record<string, { x: number; y: number }>;

/**
 * Il backend ha usato nomi diversi in due risposte diverse per lo stesso
 * campo (df/md/fw nell'esempio embedded, defenders/midfielders/forwards
 * nel nuovo GET /modules dedicato) - accettiamo entrambi, vedi
 * `getModuleCounts` in lib/tournament-team.ts per leggerli in modo sicuro.
 */
export type TournamentModule = {
  id: number;
  name: string;
  df?: number;
  md?: number;
  fw?: number;
  defenders?: number;
  midfielders?: number;
  forwards?: number;
  schema: TournamentModuleSchema;
};

/** Valori reali visti nel DB, "COACH" incluso per errore - va filtrato. */
export type PlayerPosition =
  | "GOALKEEPER"
  | "DEFENDER"
  | "MIDFIELDER"
  | "ATTACKER"
  | "COACH";

/** I 7 slot panchina sono fissi, identici per ogni modulo (non da schema). */
export const BENCH_SLOT_KEYS = [
  "goalkeeper_bench",
  "defender_bench_1",
  "defender_bench_2",
  "midfielder_bench_1",
  "midfielder_bench_2",
  "attacker_bench_1",
  "attacker_bench_2",
] as const;

export type LineupSlotAssignment = {
  player_id: number;
  is_captain: boolean;
};

export type LineupPayload = {
  module_id: number;
  lineup: Record<string, LineupSlotAssignment>;
};

export type FantaTeamFormationEntry = {
  /** Identificativo della riga di formazione, non va inviato come player_id. */
  fanta_lineup_id: number;
  /** Identificativo del giocatore da inviare come player_id negli aggiornamenti. */
  id: number;
  name: string;
  avatar: string | null;
  points: number;
  /** Laravel lo serializza come booleano oppure come 0/1 in base al model cast. */
  is_captain: boolean | 0 | 1;
  team_images: string[];
  minutes_played: number;
  /** False per titolare assente e per riserva non entrata. Decide il backend, non calcolare in frontend. */
  counts_for_points?: boolean;
  /** "out" titolare sostituito, "in" riserva entrata; with_id = fanta_lineup_id dell'altro giocatore. */
  substitution?: { status: "in" | "out"; with_id: number } | null;
};

export type UserFantaTeam = {
  id: number;
  name: string;
  points: number;
  penalties_points: number;
  captain_points: number;
  tournament_id: number;
  module_id: number;
  module?: TournamentModule;
  created_at: string;
  updated_at: string;
  formation_data: Record<string, FantaTeamFormationEntry>;
};

export type FixtureTeam = {
  id: number;
  name: string;
  logo: string;
};

export type TournamentFixture = {
  id: number;
  name: string;
  /** Codice Sportmonks: "NS" non iniziata, "FT" finita, altri = in corso/sospesa. */
  state: string;
  /** Null finche' la partita non e' iniziata. */
  home_team_score: number | null;
  away_team_score: number | null;
  start_date: string;
  home_team: FixtureTeam;
  away_team: FixtureTeam;
  league: League;
};

export type TournamentPlayerTeam = {
  id: number;
  name: string;
  jersey_number: number;
};

export type TournamentPlayer = {
  id: number;
  name: string;
  display_name: string;
  position: string;
  image_path: string;
  teams: TournamentPlayerTeam[];
};

export type TournamentDetail = Tournament & {
  creator: {
    id: number;
    name: string;
    username: string;
  };
  modules: TournamentModule[];
  fixtures: TournamentFixture[];
  fantateams: unknown[];
  prizes: unknown[];
  players: TournamentPlayer[];
  /** Presente solo se loggati e iscritti - assente, non null, se non iscritti. */
  user_fanta_team?: UserFantaTeam;
  /** Calcolato dal backend: stato torneo + scadenza iscrizioni gia' incrociati. */
  is_editable?: boolean;
};

export type TournamentRankingUser = {
  id?: number;
  name?: string;
  username?: string;
  avatar?: string | null;
};

/**
 * Il backend non restituisce una posizione: e' l'indice nell'array (+1),
 * gia' ordinato per points decrescente lato server.
 */
export type TournamentRankingEntry = {
  id: number;
  name: string;
  points: number;
  penalties_points: number;
  captain_points: number;
  user: TournamentRankingUser;
  tournament_id: number;
  module_id: number;
};

/**
 * Risposta di GET /tournaments/{id}/fantateams/{teamId}/details - stesso
 * formato di formation_data usato in UserFantaTeam, con in piu' utente e
 * modulo esteso. Disponibile solo a torneo avviato (403 prima).
 */
export type TournamentTeamDetails = {
  id: number;
  name: string;
  module_id: number;
  formation_data: Record<string, FantaTeamFormationEntry>;
  points: number;
  penalties_points: number;
  captain_points: number;
  user: {
    id: number;
    name: string;
  };
  module: TournamentModule;
};

export type TournamentPlayerStatistic = {
  type: string;
  label: string;
  value: number | string | boolean | null;
  points: number;
};

export type TournamentPlayerDetails = {
  player: {
    id?: number;
    display_name: string;
    position: PlayerPosition;
    image_path?: string | null;
  };
  minutes_played: number;
  is_captain: boolean;
  points_breakdown: {
    base_points: number;
    bonus_points: number;
    penalties_points: number;
    total_points: number;
  };
  statistics: TournamentPlayerStatistic[];
};

export type PaginatedResponse<T> = {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};
