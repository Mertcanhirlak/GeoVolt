// src/components/DecorIcons.jsx

export function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="100%" height="100%">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" strokeLinejoin="round" />
    </svg>
  );
}

export function PlugIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="100%" height="100%">
      <path d="M9 2v5M15 2v5M6 7h12v4a6 6 0 0 1-12 0V7Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 17v5" strokeLinecap="round" />
    </svg>
  );
}

export function CarIcon() {
  return (
    <svg viewBox="0 0 48 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="100%" height="100%">
      <path d="M4 16 6 9c.6-1.8 2-3 4-3h16c2 0 3.4 1.2 4 3l2 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 16h44v3H2z" strokeLinejoin="round" />
      <circle cx="12" cy="19.5" r="2.5" />
      <circle cx="36" cy="19.5" r="2.5" />
      <path d="M20 13h5l-1.5 3H22z" strokeLinejoin="round" />
    </svg>
  );
}

export function CircuitIcon() {
  return (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" width="100%" height="100%">
      <circle cx="6" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="34" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="34" r="2.5" fill="currentColor" stroke="none" />
      <path d="M6 6h14v20H20M20 6h14v20" strokeLinecap="round" />
    </svg>
  );
}