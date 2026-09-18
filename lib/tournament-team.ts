import {
  BENCH_SLOT_KEYS,
  type FantaTeamFormationEntry,
  type LineupPayload,
  type PlayerPosition,
  type TournamentFixture,
  type TournamentModule,
  type TournamentPlayer,
} from "@/types/tournament";

/**
 * Converte la formazione del dettaglio torneo nel payload editabile.
 * `entry.id` e' l'id del giocatore; `fanta_lineup_id` identifica invece la
 * riga di formazione e non deve mai finire nel campo `player_id` della PUT.
 */
export function buildLineupFromFormationData(
  formationData: Record<string, FantaTeamFormationEntry>
): LineupPayload["lineup"] {
  const lineup: LineupPayload["lineup"] = {};

  Object.entries(formationData).forEach(([slot, entry]) => {
    if (Number.isInteger(entry.id) && entry.id > 0) {
      lineup[slot] = {
        player_id: entry.id,
        is_captain: Boolean(entry.is_captain),
      };
    }
  });

  return lineup;
}

/**
 * Il giocatore porta solo id/nome/numero della sua squadra, mai il logo -
 * quello arriva solo dentro le fixture (home_team/away_team). Per mostrare
 * lo stemma sulla card giocatore si incrocia per id.
 */
export function buildTeamLogoMap(fixtures: TournamentFixture[]) {
  const map = new Map<number, string>();

  fixtures.forEach((fixture) => {
    if (fixture.home_team.logo) map.set(fixture.home_team.id, fixture.home_team.logo);
    if (fixture.away_team.logo) map.set(fixture.away_team.id, fixture.away_team.logo);
  });

  return map;
}

/** Legge df/md/fw o defenders/midfielders/forwards, qualunque dei due arrivi. */
export function getModuleCounts(module: TournamentModule) {
  return {
    defenders: module.defenders ?? module.df ?? 0,
    midfielders: module.midfielders ?? module.md ?? 0,
    forwards: module.forwards ?? module.fw ?? 0,
  };
}

export function getStarterSlotKeys(module: TournamentModule): string[] {
  return Object.keys(module.schema);
}

/**
 * Stesso prefisso per titolari (chiavi da schema, variano per modulo) e
 * panchina (chiavi fisse) - confermato dal backend su tutti i 26 moduli:
 * goalkeeper*, defender_*, midfielder_*, attacker_*.
 */
export function getRequiredPositionForSlot(slotKey: string): PlayerPosition {
  if (slotKey.startsWith("goalkeeper")) return "GOALKEEPER";
  if (slotKey.startsWith("defender")) return "DEFENDER";
  if (slotKey.startsWith("midfielder")) return "MIDFIELDER";
  return "ATTACKER";
}

/** "COACH" e' un valore reale nel DB (allenatori finiti tra i giocatori per errore). */
export function isSelectablePlayer(
  player: TournamentPlayer
): player is TournamentPlayer & { position: Exclude<PlayerPosition, "COACH"> } {
  return player.position !== "COACH";
}

export function getSlotLabel(slotKey: string): string {
  const ROLE_LABEL: Record<PlayerPosition, string> = {
    GOALKEEPER: "Portiere",
    DEFENDER: "Difensore",
    MIDFIELDER: "Centrocampista",
    ATTACKER: "Attaccante",
    COACH: "Allenatore",
  };

  const role = ROLE_LABEL[getRequiredPositionForSlot(slotKey)];
  const match = slotKey.match(/(\d+)$/);

  return match ? `${role} ${match[1]}` : role;
}

/**
 * Riempie tutti gli slot (titolari + panchina fissa) pescando a caso dal
 * pool, rispettando il ruolo richiesto - stesso vincolo che applica il
 * backend, cosi' il bottone "casuale" non genera mai una formazione che
 * poi verrebbe rifiutata per un ruolo sbagliato. Se il pool non ha abbastanza
 * giocatori di un ruolo, quello slot resta vuoto (l'utente lo completa a mano).
 */
export function buildRandomLineup(
  module: TournamentModule,
  players: TournamentPlayer[]
): LineupPayload["lineup"] {
  const allSlots = [...getStarterSlotKeys(module), ...BENCH_SLOT_KEYS];
  const usedPlayerIds = new Set<number>();
  const lineup: LineupPayload["lineup"] = {};

  for (const slot of allSlots) {
    const requiredPosition = getRequiredPositionForSlot(slot);
    const candidates = players.filter(
      (player) =>
        player.position === requiredPosition && !usedPlayerIds.has(player.id)
    );

    if (!candidates.length) {
      continue;
    }

    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    usedPlayerIds.add(chosen.id);
    lineup[slot] = { player_id: chosen.id, is_captain: false };
  }

  const assignedSlots = Object.keys(lineup);
  if (assignedSlots.length) {
    const captainSlot =
      assignedSlots[Math.floor(Math.random() * assignedSlots.length)];
    lineup[captainSlot] = { ...lineup[captainSlot], is_captain: true };
  }

  return lineup;
}

/**
 * I messaggi arrivano in inglese dal backend (vedi prompt/risposta backend
 * del 2026-09-17) - qui si traducono quelli noti, quelli con un nome
 * giocatore dentro si ricostruiscono con una regex, tutto il resto passa
 * cosi' com'e' invece di nascondere un errore nuovo dietro un messaggio muto.
 */
export function translateTournamentError(message: string): string {
  const direct: Record<string, string> = {
    "Already subscribed to this tournament": "Sei già iscritto a questo torneo.",
    "Tournament is full": "Il torneo ha raggiunto il numero massimo di iscritti.",
    "Selected module is not available for this tournament":
      "Il modulo selezionato non è disponibile per questo torneo.",
    "You must select a captain": "Devi scegliere un capitano.",
    "You can only select one captain": "Puoi scegliere un solo capitano.",
    "One or more selected players do not exist":
      "Uno o più giocatori selezionati non esistono più.",
    "Insufficient balance to join this tournament":
      "Saldo insufficiente per iscriverti a questo torneo.",
    "Payment processing failed": "Pagamento non riuscito. Riprova.",
    "Enrollments are closed for this tournament":
      "Le iscrizioni per questo torneo sono chiuse.",
  };

  if (direct[message]) {
    return direct[message];
  }

  if (message.startsWith("Lineup is incomplete")) {
    return `Formazione titolare incompleta - mancano: ${message.replace(
      "Lineup is incomplete. Missing field positions: ",
      ""
    )}`;
  }

  if (message.startsWith("Bench is incomplete")) {
    return `Panchina incompleta - mancano: ${message.replace(
      "Bench is incomplete. Missing bench positions: ",
      ""
    )}`;
  }

  const notInPool = message.match(
    /^Player (.+) is not available in any fixture for this tournament$/
  );
  if (notInPool) {
    return `${notInPool[1]} non fa parte del pool giocatori di questo torneo.`;
  }

  const notEligible = message.match(
    /^Player (.+) is not eligible for slot (.+): real position is (.+), slot requires (.+)$/
  );
  if (notEligible) {
    return `${notEligible[1]} non può giocare nello slot ${notEligible[2]}: il suo ruolo è ${notEligible[3]}, lo slot richiede ${notEligible[4]}.`;
  }

  return message;
}
