"use client";

import { useState } from "react";
import { resolveApiAssetUrl } from "@/lib/api";

type UserAvatarProps = {
  name: string;
  initials?: string | null;
  src?: string | null;
  className?: string;
  imageClassName?: string;
};

export function UserAvatar({
  name,
  initials,
  src,
  className = "h-10 w-10",
  imageClassName = "object-cover",
}: UserAvatarProps) {
  const fallback = initials?.trim() || getInitials(name);
  // Punto unico di passaggio per ogni avatar dell'app: se il backend manda un
  // path relativo lo si aggancia qui al suo dominio, una volta per tutte.
  const resolvedSrc = resolveApiAssetUrl(src);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#1ED8B7]/20 bg-[#123A3B] font-bold uppercase text-[#E9FFFA] ${className}`}
      aria-label={name}
    >
      {resolvedSrc ? (
        <AvatarImage
          key={resolvedSrc}
          src={resolvedSrc}
          name={name}
          fallback={fallback}
          imageClassName={imageClassName}
        />
      ) : (
        fallback
      )}
    </span>
  );
}

function AvatarImage({
  src,
  name,
  fallback,
  imageClassName,
}: {
  src: string;
  name: string;
  fallback: string;
  imageClassName: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError) return fallback;

  return (
    // User-generated URLs can come from local storage or external CDNs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      className={`h-full w-full ${imageClassName}`}
      onError={() => {
        // Senza questo, "immagine rotta" e "nessuna immagine" finiscono
        // entrambe sulle iniziali e diventano indistinguibili a schermo.
        if (process.env.NODE_ENV !== "production") {
          console.warn(`Avatar non caricato per "${name}": ${src}`);
        }
        setHasError(true);
      }}
    />
  );
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "";
  }

  // Con i nickname il nome e una parola sola: prendendo solo l'iniziale
  // resterebbe una lettera persa in mezzo al cerchio. Meglio due caratteri.
  if (words.length === 1) {
    return words[0].slice(0, 2);
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}
