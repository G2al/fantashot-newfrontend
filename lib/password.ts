/**
 * Regole password del frontend.
 *
 * Nessun obbligo di maiuscole, numeri o simboli qui: solo lunghezza minima e
 * conferma - il resto e consiglio (barra di robustezza), non requisito
 * bloccante. Da allineare quando il backend di Fantashot definisce le sue
 * regole vere.
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Lunghezza oltre la quale la password si considera comoda da sola. */
const COMFORTABLE_PASSWORD_LENGTH = 12;

export type PasswordRequirementId = "length" | "match";

export type PasswordRequirement = {
  id: PasswordRequirementId;
  met: boolean;
};

export function getPasswordRequirements(
  password: string,
  confirmation: string
): PasswordRequirement[] {
  return [
    { id: "length", met: password.length >= MIN_PASSWORD_LENGTH },
    { id: "match", met: password.length > 0 && password === confirmation },
  ];
}

export function arePasswordRequirementsMet(
  password: string,
  confirmation: string
) {
  return getPasswordRequirements(password, confirmation).every(
    (requirement) => requirement.met
  );
}

export type PasswordHintId = "longer" | "case" | "digit" | "symbol";

/** 0 = vuota, poi 1..4 da debole a ottima. */
export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export type PasswordAssessment = {
  strength: PasswordStrength;
  /** Cosa manca per salire di livello, in ordine di impatto. */
  hints: PasswordHintId[];
};

export function assessPassword(password: string): PasswordAssessment {
  if (!password) {
    return { strength: 0, hints: [] };
  }

  const hasLowerAndUpper = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const isLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const isComfortable = password.length >= COMFORTABLE_PASSWORD_LENGTH;

  const points =
    Number(isLongEnough) +
    Number(isComfortable) +
    Number(hasLowerAndUpper) +
    Number(hasDigit) +
    Number(hasSymbol);

  // Sotto la soglia minima resta "debole" comunque: una password corta non
  // diventa buona perche contiene un simbolo.
  const strength = (
    !isLongEnough ? 1 : Math.min(4, Math.max(1, points - 1))
  ) as PasswordStrength;

  const hints: PasswordHintId[] = [];
  if (!isComfortable) hints.push("longer");
  if (!hasLowerAndUpper) hints.push("case");
  if (!hasDigit) hints.push("digit");
  if (!hasSymbol) hints.push("symbol");

  return { strength, hints };
}
