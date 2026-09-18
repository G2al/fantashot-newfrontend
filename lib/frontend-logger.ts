type FrontendLogContext = Record<string, unknown>;

/** Punto unico sostituibile in seguito con Sentry o un altro provider. */
export function logFrontendError(
  message: string,
  context: FrontendLogContext = {},
  error?: unknown
) {
  console.error(`[Fantashot] ${message}`, { ...context, error });
}
