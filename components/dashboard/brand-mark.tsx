export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="40" height="40" rx="11" fill="#147d91" />
      <path
        d="M28.5 11.5C24.2 8.3 18.7 8.3 14.6 11.8c-4.5 3.8-4.5 12.6 0 16.4 4.1 3.5 9.6 3.5 13.9.3"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="20" cy="14.5" r="1.8" fill="white" />
      <path d="M20 20v6" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}
