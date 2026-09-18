"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordStrength } from "@/components/PasswordStrength";
import { FormEvent, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { getMe, register } from "@/lib/auth-api";
import {
  MIN_PASSWORD_LENGTH,
  arePasswordRequirementsMet,
} from "@/lib/password";
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  isUsernameValid,
  sanitizeUsername,
} from "@/lib/username";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    username?: string;
    email?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  // Controllati perche barra e checklist devono aggiornarsi a ogni tasto.
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const isPasswordValid = arePasswordRequirementsMet(
    password,
    passwordConfirmation,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Ultima rete prima della chiamata: il backend rivalida comunque, questo
    // serve solo a non sprecare un giro di rete per un errore gia noto.
    if (!isPasswordValid || !isUsernameValid(username) || !name.trim()) {
      return;
    }

    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      // Il register da' gia' un token, ma non i wallet: si chiama /me subito
      // dopo per avere il profilo completo, stesso schema del login.
      const { token, user: registeredUser } = await register({
        name: name.trim(),
        username,
        email: String(formData.get("email")),
        password,
      });
      try {
        const { user, wallets } = await getMe(token);
        setAuth({ ...user, wallets }, token, true);
      } catch {
        // L'account e il token esistono gia: un errore temporaneo di /me non
        // deve far ripetere la registrazione e provocare "email gia usata".
        // AppShell ritentera il caricamento del profilo dalla dashboard.
        setAuth(registeredUser, token, true);
      }
      router.replace("/dashboard");
    } catch (requestError) {
      if (requestError instanceof ApiError) {
        const nameError = getFieldError(requestError.data, "name");
        const usernameError = getFieldError(requestError.data, "username");
        const emailError = getFieldError(requestError.data, "email");

        setFieldErrors({
          name: nameError,
          username: usernameError,
          email: emailError,
        });

        if (!nameError && !usernameError && !emailError) {
          setError(requestError.message);
        }
      } else {
        setError("Registrazione non riuscita. Riprova.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#06111B] text-zinc-50 lg:-mb-32 lg:-mt-8">
      <section className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
        <div className="w-full rounded-2xl border border-white/10 bg-[#0F1E2E]/88 px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-10 sm:py-12">
          <div className="flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- asset di brand sostituito spesso durante lo sviluppo: la cache dell'ottimizzatore next/image intrappolava versioni vecchie */}
            <img
              src="/images/logo-fantashot.png"
              alt="Fantashot"
              className="h-auto w-64"
            />
            <h1 className="mt-8 text-2xl font-black uppercase tracking-wide text-zinc-50">
              Crea il tuo account
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="full-name"
                className="text-sm font-medium text-zinc-200"
              >
                Nome
              </label>
              <input
                id="full-name"
                name="full-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                placeholder="Il tuo nome"
                aria-invalid={Boolean(fieldErrors.name)}
                className={`w-full rounded-lg border bg-[#101D2C] px-4 py-3.5 text-base text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-[#22E6C3] focus:ring-2 focus:ring-[#22E6C3]/20 ${
                  fieldErrors.name ? "border-red-500/50" : "border-white/10"
                }`}
              />
              {fieldErrors.name ? (
                <p className="text-sm text-red-300">{fieldErrors.name}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="username"
                className="text-sm font-medium text-zinc-200"
              >
                Username
              </label>
              {/* Si filtra mentre scrive invece di rimproverarlo dopo:
                      spazi e simboli non entrano proprio, cosi il campo non
                      puo finire in uno stato che il backend rifiuterebbe. */}
              <input
                id="username"
                name="username"
                required
                minLength={MIN_USERNAME_LENGTH}
                maxLength={MAX_USERNAME_LENGTH}
                value={username}
                onChange={(event) =>
                  setUsername(sanitizeUsername(event.target.value))
                }
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="Il tuo username"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={
                  fieldErrors.username ? "username-error" : "username-hint"
                }
                className={`w-full rounded-lg border bg-[#101D2C] px-4 py-3.5 text-base text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-[#22E6C3] focus:ring-2 focus:ring-[#22E6C3]/20 ${
                  fieldErrors.username ? "border-red-500/50" : "border-white/10"
                }`}
              />
              {fieldErrors.username ? (
                <p id="username-error" className="text-sm text-red-300">
                  {fieldErrors.username}
                </p>
              ) : (
                <p
                  id="username-hint"
                  className={`text-xs transition-colors ${
                    isUsernameValid(username)
                      ? "text-green-400"
                      : "text-zinc-500"
                  }`}
                >
                  Da {MIN_USERNAME_LENGTH} a {MAX_USERNAME_LENGTH} caratteri,
                  solo lettere e numeri.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-200"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nome@esempio.it"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className="w-full rounded-lg border border-white/10 bg-[#101D2C] px-4 py-3.5 text-base text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-[#22E6C3] focus:ring-2 focus:ring-[#22E6C3]/20"
              />
              {fieldErrors.email ? (
                <p id="email-error" className="text-sm text-red-300">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            <PasswordInput
              id="password"
              name="password"
              label="Password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={setPassword}
              describedBy="password-strength"
              isVisible={showPassword}
              onToggle={() => setShowPassword((isVisible) => !isVisible)}
            />

            <PasswordInput
              id="password_confirmation"
              name="password_confirmation"
              label="Conferma password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={passwordConfirmation}
              onChange={setPasswordConfirmation}
              describedBy="password-strength"
              isVisible={showPasswordConfirmation}
              onToggle={() =>
                setShowPasswordConfirmation((isVisible) => !isVisible)
              }
            />

            <PasswordStrength
              id="password-strength"
              password={password}
              confirmation={passwordConfirmation}
            />

            {error ? (
              <p className="rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                isSubmitting ||
                !isPasswordValid ||
                !isUsernameValid(username) ||
                !name.trim()
              }
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#22E6C3] to-[#18C6A7] px-4 py-3.5 text-sm font-black uppercase tracking-wide text-[#06111B] shadow-[0_10px_28px_rgba(34,230,195,0.28)] transition hover:from-[#1ED8B7] hover:to-[#22E6C3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creazione in corso..." : "Crea account"}
            </button>
          </form>

          <p className="mt-8 border-t border-white/8 pt-6 text-center text-sm text-zinc-400">
            Hai gia un account?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#1ED8B7] transition hover:text-[#3AF5D4]"
            >
              Accedi
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function getFieldError(data: unknown, field: string): string | undefined {
  if (typeof data !== "object" || data === null || !("errors" in data)) {
    return undefined;
  }

  const errors = (data as { errors?: Record<string, unknown> }).errors;
  const fieldErrors = errors?.[field];

  if (!Array.isArray(fieldErrors)) {
    return undefined;
  }

  return fieldErrors.find(
    (message): message is string => typeof message === "string",
  );
}

function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  minLength,
  value,
  onChange,
  describedBy,
  isVisible,
  onToggle,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  isVisible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-zinc-200">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isVisible ? "text" : "password"}
          required
          minLength={minLength}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-describedby={describedBy}
          placeholder="••••••••"
          className="w-full rounded-lg border border-white/10 bg-[#101D2C] px-4 py-3.5 pr-12 text-base text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-[#22E6C3] focus:ring-2 focus:ring-[#22E6C3]/20"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={isVisible ? "Nascondi password" : "Mostra password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-400 transition hover:text-[#3AF5D4]"
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.5 5.4A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.4 17.4 0 0 1-2.1 3.2" />
      <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.2-.9" />
    </svg>
  );
}
