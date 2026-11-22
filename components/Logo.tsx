type Props = {
  className?: string;
  title?: string;
};

/** Organic four-point spark: the fasttrack mark. */
export default function LogoMark({ className = "h-7 w-7", title }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="currentColor"
      fillRule="evenodd"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d="M27 4C28 11 30 17 34 22C40 26 50 25 61 29C51 33 46 35 44 41C42 47 39 54 36 61C32 53 28 47 24 45C18 42 10 41 3 36C10 32 14 29 15 25C16 19 20 12 27 4ZM40.5 30C39 27 34 27 29.5 29.2C25.5 31.2 24 34.8 26 37.2C28 39.6 33.5 39 38 36.6C41 35 42 32.4 40.5 30Z" />
    </svg>
  );
}

/** Mark plus wordmark, shared by every header in the app. */
export function Wordmark({
  className = "",
  markClassName = "h-7 w-7",
  textClassName = "text-[22px]",
}: Props & {
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap ${className}`}>
      <LogoMark className={`shrink-0 ${markClassName}`} />
      <span className={`font-display font-bold tracking-[-0.04em] ${textClassName}`}>
        fasttrack
      </span>
    </span>
  );
}
