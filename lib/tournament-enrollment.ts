import type { Tournament } from "@/types/tournament";

/** Tutti i posti occupati. Lo stato resta "enrollments" finche' non scade la chiusura iscrizioni. */
export function isTournamentFull(
  tournament: Pick<Tournament, "enrolled_users_count" | "max_participants">,
) {
  return tournament.max_participants > 0 && tournament.enrolled_users_count >= tournament.max_participants;
}

/**
 * Torneo pieno per chi NON e' iscritto: non puo' piu' entrare, quindi per lui
 * il countdown utile e' quello all'inizio del torneo (starts_at). Chi e' gia'
 * iscritto puo' ancora modificare la formazione fino a enrollments_end_date,
 * quindi per lui resta la chiusura.
 */
export function isFullForVisitor(tournament: Tournament) {
  return (
    tournament.status === "enrollments" &&
    !tournament.is_user_registered &&
    isTournamentFull(tournament)
  );
}

/** Data verso cui conta il countdown e sua etichetta. */
export function getCountdownTarget(tournament: Tournament): {
  target: string | null;
  label: string;
} {
  if (tournament.status !== "enrollments") {
    return { target: null, label: "" };
  }

  if (isFullForVisitor(tournament)) {
    return { target: tournament.starts_at ?? null, label: "Inizia tra" };
  }

  return { target: tournament.enrollments_end_date, label: "Chiusura tra" };
}
