"use client";

import {
  MIN_PASSWORD_LENGTH,
  assessPassword,
  getPasswordRequirements,
  type PasswordHintId,
  type PasswordRequirementId,
  type PasswordStrength as PasswordStrengthLevel,
} from "@/lib/password";

const STRENGTH_LABEL: Record<PasswordStrengthLevel, string> = {
  0: "",
  1: "Debole",
  2: "Discreta",
  3: "Buona",
  4: "Ottima",
};

const STRENGTH_BAR_CLASSNAME: Record<PasswordStrengthLevel, string> = {
  0: "bg-zinc-700",
  1: "bg-red-400",
  2: "bg-amber-300",
  3: "bg-orange-400",
  4: "bg-emerald-400",
};

const STRENGTH_TEXT_CLASSNAME: Record<PasswordStrengthLevel, string> = {
  0: "text-zinc-500",
  1: "text-red-300",
  2: "text-amber-200",
  3: "text-orange-300",
  4: "text-emerald-300",
};

const REQUIREMENT_LABEL: Record<PasswordRequirementId, string> = {
  length: `Almeno ${MIN_PASSWORD_LENGTH} caratteri`,
  match: "Le password coincidono",
};

const HINT_LABEL: Record<PasswordHintId, string> = {
  longer: "piu lunga",
  case: "maiuscole e minuscole",
  digit: "un numero",
  symbol: "un simbolo",
};

const TOTAL_SEGMENTS = 4;

/**
 * Barra di robustezza piu checklist dei requisiti.
 *
 * Le due parti dicono cose diverse e non vanno confuse: la checklist elenca
 * cio che blocca l'invio, la barra e un consiglio sulla solidita e non
 * blocca mai niente.
 */
export function PasswordStrength({
  password,
  confirmation,
  id,
}: {
  password: string;
  confirmation: string;
  id?: string;
}) {
  const { strength, hints } = assessPassword(password);
  const requirements = getPasswordRequirements(password, confirmation);

  return (
    <div id={id} className="space-y-3 rounded-lg border border-white/8 bg-black/20 p-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500">
            Robustezza password
          </span>
          <span
            className={`text-xs font-black ${STRENGTH_TEXT_CLASSNAME[strength]}`}
          >
            {STRENGTH_LABEL[strength]}
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL_SEGMENTS}
          aria-valuenow={strength}
          aria-valuetext={STRENGTH_LABEL[strength]}
          aria-label="Robustezza password"
          className="mt-2 flex gap-1"
        >
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                index < strength
                  ? STRENGTH_BAR_CLASSNAME[strength]
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>

        {password && hints.length ? (
          <p className="mt-2 text-[11px] leading-snug text-zinc-500">
            Per renderla piu forte: {hints.map((hint) => HINT_LABEL[hint]).join(", ")}.
          </p>
        ) : null}
      </div>

      <ul className="space-y-1.5 border-t border-white/8 pt-3">
        {requirements.map((requirement) => (
          <li
            key={requirement.id}
            className={`flex items-center gap-2 text-xs transition-colors ${
              requirement.met ? "text-emerald-300" : "text-zinc-500"
            }`}
          >
            <RequirementMark met={requirement.met} />
            {REQUIREMENT_LABEL[requirement.id]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequirementMark({ met }: { met: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
        met
          ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-300"
          : "border-white/15 text-transparent"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 12 4 4L19 6" />
      </svg>
    </span>
  );
}
