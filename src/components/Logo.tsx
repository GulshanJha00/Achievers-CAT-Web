export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="15" cy="15" r="14" stroke="#22C55E" strokeWidth="2" />
        <circle cx="15" cy="15" r="8.5" stroke="#22C55E" strokeWidth="2" />
        <circle cx="15" cy="15" r="3" fill="#22C55E" />
      </svg>
      <span className="font-display leading-none">
        <span className="block text-[13px] font-semibold tracking-[0.14em] text-foreground">
          ACHIEVERS
        </span>
        <span className="block text-[13px] font-extrabold tracking-[0.14em] text-brand -mt-0.5">
          CAT
        </span>
      </span>
    </span>
  );
}
