type BrandLogoProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  textColor?: "light" | "dark";
  className?: string;
};

export function BrandLogo({
  size = "md",
  showText = true,
  textColor = "dark",
  className = "",
}: BrandLogoProps) {
  const iconSizeClass =
    size === "sm" ? "h-10" : size === "lg" ? "h-16" : "h-12";

  const titleSizeClass =
    size === "sm" ? "text-xl" : size === "lg" ? "text-3xl" : "text-2xl";

  const titleColorClass =
    textColor === "light" ? "text-white" : "text-[#061B4D]";

  const subtitleColorClass =
    textColor === "light" ? "text-blue-100" : "text-slate-500";

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <img
        src="/logo-siec.png"
        alt="Logo SIEC Flow AI"
        className={`${iconSizeClass} w-auto shrink-0 object-contain`}
      />

      {showText && (
        <div className="leading-tight">
          <h1
            className={`${titleSizeClass} font-black tracking-tight ${titleColorClass}`}
          >
            SIEC Flow AI
          </h1>

          <p
            className={`mt-1 text-xs font-semibold uppercase tracking-[0.22em] ${subtitleColorClass}`}
          >
            Centro de control
          </p>
        </div>
      )}
    </div>
  );
}
