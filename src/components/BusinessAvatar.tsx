import { useState } from "react";

type Props = {
  logoUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-10 w-10 text-[11px]",
  md: "h-12 w-12 text-[13px]",
  lg: "h-14 w-14 text-[14px]",
};

export default function BusinessAvatar({ logoUrl, name, size = "md" }: Props) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

  const showLogo = !!logoUrl && !imgError;

  return (
    <div
      className={`${sizeClasses[size]} shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm`}
    >
      {showLogo ? (
        <img
          src={logoUrl!}
          alt={`${name} logo`}
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="h-full w-full grid place-items-center font-semibold text-slate-700 bg-slate-50">
          {initials}
        </div>
      )}
    </div>
  );
}
