"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { resolveApiAssetUrl } from "@/lib/api";

export function CustomDropdown({
  ariaLabel,
  buttonClassName,
  buttonContent,
  options,
  value,
  onChange,
  disabled = false,
}: {
  ariaLabel: string;
  buttonClassName?: string;
  buttonContent: React.ReactNode;
  options: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeDropdown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("pointerdown", closeDropdown);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeDropdown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
        className={`flex w-full items-center gap-2 rounded-md border border-white/10 bg-[#1c0b09]/90 text-sm outline-none transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName ?? ""}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {buttonContent}
        <span
          className={`ml-auto text-zinc-400 transition ${isOpen ? "rotate-180" : ""}`}
        >
          <ChevronDownIcon />
        </span>
      </button>

      {isOpen ? (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-2 min-w-full overflow-hidden rounded-md border border-white/10 bg-[#1c0b09] p-1 shadow-[0_18px_50px_rgba(0,0,0,0.5)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition ${
                  isSelected
                    ? "bg-red-500/20 text-red-200"
                    : "text-zinc-300 hover:bg-white/6 hover:text-white"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CountryLogo({
  logoUrl,
  flag,
  name,
}: {
  logoUrl: string | null;
  flag: string;
  name: string;
}) {
  const resolvedLogoUrl = resolveApiAssetUrl(logoUrl);

  if (resolvedLogoUrl) {
    return (
      <span className="relative h-5 w-5 flex-none overflow-hidden rounded-full border border-white/15 bg-white/5">
        <Image
          src={resolvedLogoUrl}
          alt={name}
          fill
          sizes="20px"
          className="object-cover"
        />
      </span>
    );
  }

  return (
    <span
      className="w-5 flex-none text-center text-base leading-none"
      aria-hidden="true"
    >
      {flag}
    </span>
  );
}

export function LeagueLogo({
  logoUrl,
  label,
  large = false,
}: {
  logoUrl: string | null;
  label: string;
  large?: boolean;
}) {
  const size = large ? "h-11 w-11" : "h-7 w-7";
  const resolvedLogoUrl = resolveApiAssetUrl(logoUrl);

  if (resolvedLogoUrl) {
    return (
      <div className={`relative ${size}`}>
        <Image
          src={resolvedLogoUrl}
          alt={label}
          fill
          sizes={large ? "44px" : "28px"}
          className="object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`${size} grid place-items-center rounded-xl bg-white/6 text-xs font-bold uppercase text-zinc-100`}
    >
      {getInitials(label)}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5 text-zinc-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
