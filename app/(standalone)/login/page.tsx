"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { getMe, login } from "@/lib/auth-api";

const REMEMBERED_EMAIL_KEY = "fantashot_remembered_email";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const rememberRef = useRef<HTMLInputElement>(null);

  // I campi sono volutamente non controllati: precompilarli dopo il mount
  // evita il mismatch di hydration fra HTML del server e localStorage.
  useEffect(() => {
    const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);

    if (!remembered) {
      return;
    }

    if (emailRef.current) {
      emailRef.current.value = remembered;
    }

    if (rememberRef.current) {
      rememberRef.current.checked = true;
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email")).trim();
    const rememberMe = rememberRef.current?.checked ?? false;

    try {
      // Il login restituisce solo il token: i dati utente (e il wallet)
      // arrivano da /me, chiamata subito dopo con quel token.
      const { token } = await login({
        email,
        password: String(formData.get("password")),
      });
      const { user, wallets } = await getMe(token);

      if (rememberMe) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      setAuth({ ...user, wallets }, token, rememberMe);
      router.push("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : "Accesso non riuscito. Riprova.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 bg-[#0c0504] text-zinc-50 lg:-mb-32 lg:-mt-8">
      <section className="mx-auto flex min-h-screen max-w-lg items-center px-5 py-12">
        <div className="w-full rounded-2xl border border-white/10 bg-[#1c0b09]/88 px-6 py-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:px-10 sm:py-12">
          <div className="flex flex-col items-center">
            <Image
              src="/images/logo-fantashot.png"
              alt="Fantashot"
              width={260}
              height={87}
              priority
              className="h-auto w-64"
            />
            <h1 className="mt-8 text-2xl font-black uppercase tracking-wide text-zinc-50">
              Accedi
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-200"
              >
                Email
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="La tua email"
                className="w-full rounded-lg border border-white/10 bg-[#150705] px-4 py-3.5 text-base text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
              />
            </div>

            <PasswordInput
              id="password"
              name="password"
              label="Password"
              autoComplete="current-password"
              isVisible={showPassword}
              onToggle={() => setShowPassword((isVisible) => !isVisible)}
            />

            <label className="flex cursor-pointer select-none items-center gap-3 pt-1">
              <input
                ref={rememberRef}
                type="checkbox"
                name="remember_me"
                defaultChecked={false}
                className="peer sr-only"
              />
              <span className="flex h-5 w-5 flex-none items-center justify-center rounded-md border border-white/20 bg-[#150705] text-transparent transition peer-checked:border-red-500 peer-checked:bg-red-500 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-red-500/40">
                <CheckIcon />
              </span>
              <span className="text-sm text-zinc-300">Ricordami</span>
            </label>

            {error ? (
              <p className="rounded-lg bg-red-950/60 px-4 py-3 text-sm text-red-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-3.5 text-sm font-black uppercase tracking-wide text-white shadow-[0_10px_28px_rgba(220,38,38,0.28)] transition hover:from-red-400 hover:to-red-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Accesso in corso..." : "Accedi"}
            </button>
          </form>

          <p className="mt-8 border-t border-white/8 pt-6 text-center text-sm text-zinc-400">
            Non hai un account?{" "}
            <Link
              href="/register"
              className="font-semibold text-red-400 transition hover:text-red-300"
            >
              Registrati
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  isVisible,
  onToggle,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
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
          autoComplete={autoComplete}
          placeholder="••••••••"
          className="w-full rounded-lg border border-white/10 bg-[#150705] px-4 py-3.5 pr-12 text-base text-zinc-50 outline-none transition placeholder:text-zinc-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={isVisible ? "Nascondi password" : "Mostra password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-400 transition hover:text-red-300"
        >
          {isVisible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
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
