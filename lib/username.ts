/**
 * Regole dello username: solo lettere e numeri, nessuno spazio, da 3 a 20
 * caratteri. L'univocita puo verificarla solo il server.
 */

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

const DISALLOWED_CHARACTERS = /[^A-Za-z0-9]/g;

/**
 * Ripulisce quello che l'utente digita: toglie spazi e simboli e taglia alla
 * lunghezza massima. Si preferisce filtrare mentre scrive invece di
 * rimproverarlo dopo, cosi il campo non puo mai finire in uno stato invalido.
 */
export function sanitizeUsername(value: string) {
  return value.replace(DISALLOWED_CHARACTERS, "").slice(0, MAX_USERNAME_LENGTH);
}

export function isUsernameValid(value: string) {
  return (
    value.length >= MIN_USERNAME_LENGTH && value.length <= MAX_USERNAME_LENGTH
  );
}
