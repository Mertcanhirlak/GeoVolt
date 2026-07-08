export function LogoMarkA({ size = 56 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4C19.85 4 10 13.85 10 26c0 16.5 22 34 22 34s22-17.5 22-34C54 13.85 44.15 4 32 4Z" fill="var(--color-surface-alt)" stroke="var(--color-volt)" strokeWidth="2" />
      <path d="M34.5 13 22 30h8.5L29 47l13-19h-8.5L36 13Z" fill="var(--color-volt)" />
    </svg>
  );
}

export function LogoMarkB({ size = 56 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <polygon points="32,6 54.52,19 54.52,45 32,58 9.48,45 9.48,19" fill="var(--color-surface-alt)" stroke="var(--color-volt)" strokeWidth="2" />
      <path d="M34.5 13 22 30h8.5L29 47l13-19h-8.5L36 13Z" fill="var(--color-volt)" />
    </svg>
  );
}

export function LogoMarkC({ size = 56 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-geo)" strokeWidth="2" />
      <circle cx="32" cy="32" r="18" fill="none" stroke="var(--color-geo)" strokeWidth="1.5" opacity="0.7" />
      <circle cx="32" cy="32" r="10" fill="none" stroke="var(--color-geo)" strokeWidth="1.5" opacity="0.5" />
      <path d="M35.5 20 26 33h6L30 46l10-14h-6L37 20Z" fill="var(--color-volt)" />
    </svg>
  );
}

export function LogoMarkD({ size = 56 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <path d="M32 4C19.85 4 10 13.85 10 26c0 16.5 22 34 22 34s22-17.5 22-34C54 13.85 44.15 4 32 4Z" fill="var(--color-surface-alt)" stroke="var(--color-volt)" strokeWidth="2" />
      <rect x="24" y="16" width="6" height="14" rx="2" fill="var(--color-volt)" />
      <rect x="34" y="16" width="6" height="14" rx="2" fill="var(--color-volt)" />
      <path d="M20 32a12 8 0 0 0 24 0" fill="none" stroke="var(--color-volt)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}