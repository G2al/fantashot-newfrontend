"use client";

import { useState } from "react";
import { resolveApiAssetUrl } from "@/lib/api";

type UserAvatarProps = {
  name: string;
  src?: string | null;
  className?: string;
  imageClassName?: string;
};

export function UserAvatar({
  name,
  src,
  className = "h-10 w-10",
  imageClassName = "object-cover",
}: UserAvatarProps) {
  // Punto unico di passaggio per ogni avatar dell'app: se il backend manda un
  // path relativo lo si aggancia qui al suo dominio, una volta per tutte.
  const resolvedSrc = resolveApiAssetUrl(src);

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#1ED8B7]/20 bg-[#123A3B] text-[#E9FFFA] ${className}`}
      aria-label={name}
    >
      {resolvedSrc ? (
        <AvatarImage
          key={resolvedSrc}
          src={resolvedSrc}
          name={name}
          fallback={<DefaultPersonIcon />}
          imageClassName={imageClassName}
        />
      ) : (
        <DefaultPersonIcon />
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
  fallback: React.ReactNode;
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

/** Icona profilo generica di default, al posto delle iniziali quando manca una foto. */
function DefaultPersonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[62%] w-[62%] text-[#3AF5D4]/70"
    >
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
      <path d="M4 21a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
    </svg>
  );
}
