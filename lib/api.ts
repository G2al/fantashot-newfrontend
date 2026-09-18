const API_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

/** Origine del backend, senza il suffisso /api/v1: gli asset stanno alla radice. */
const API_ORIGIN = (() => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return "";
  }
})();

/**
 * Rende assoluto un URL di asset che il backend potrebbe mandare relativo.
 *
 * Se frontend e backend finiscono su domini diversi, un path tipo
 * "/storage/avatars/x.jpg" verrebbe risolto dal browser sul dominio
 * sbagliato. Lasciato passare intatto tutto cio che e gia assoluto o inline.
 */
export function resolveApiAssetUrl(url?: string | null): string | null {
  const trimmed = url?.trim();

  if (!trimmed) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  if (!API_ORIGIN) {
    return trimmed;
  }

  return `${API_ORIGIN}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
}

type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: HeadersInit;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token, headers } = options;
  const url = `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body:
      body == null
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });

  const data = await readJson(response);

  if (!response.ok) {
    const message =
      getErrorMessage(data) ?? `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(data: unknown): string | null {
  if (typeof data === "object" && data !== null && "errors" in data) {
    const errors = (data as { errors?: Record<string, string[]> }).errors;
    const firstError = errors ? Object.values(errors).flat()[0] : null;

    return firstError ?? null;
  }

  if (typeof data === "object" && data !== null && "message" in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  // Il login con credenziali sbagliate non usa ne "errors" ne "message": il
  // backend manda { "error": "Unauthorised" }, una terza forma a se stante.
  if (typeof data === "object" && data !== null && "error" in data) {
    const error = (data as { error?: unknown }).error;

    if (error === "Unauthorised") {
      return "Email o password non corretti.";
    }

    return typeof error === "string" ? error : null;
  }

  return null;
}
