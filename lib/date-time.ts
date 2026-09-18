/**
 * Laravel serializza alcuni campi applicativi come `YYYY-MM-DD HH:mm:ss`
 * senza indicare il fuso. Il backend Fantashot usa UTC, quindi rendiamo
 * esplicito il suffisso prima di affidare la stringa al browser.
 */
export function parseApiDateTime(value: string): Date {
  const normalized = value.trim();

  if (!normalized) {
    return new Date(Number.NaN);
  }

  if (/Z$|[+-]\d{2}:?\d{2}$/i.test(normalized)) {
    return new Date(normalized);
  }

  return new Date(`${normalized.replace(" ", "T")}Z`);
}

export function getApiDateTimeMs(value: string): number {
  return parseApiDateTime(value).getTime();
}
