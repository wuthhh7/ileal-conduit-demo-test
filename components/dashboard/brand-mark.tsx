export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M16.5 9.5V7a3.5 3.5 0 0 1 7 0v2.5M17 38.5V42a3 3 0 0 0 6 0v-3.5M20 45v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="7.5"
        y="9.5"
        width="25"
        height="29"
        rx="7"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path d="M18 18.5h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="currentColor" />
    </svg>
  );
}
