function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "verified today";
  if (days === 1) return "verified yesterday";
  if (days < 30) return `verified ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `verified ${months}mo ago`;
  return `verified ${Math.floor(months / 12)}y ago`;
}

export function VerifiedBadge({ lastVerifiedAt }: { lastVerifiedAt: string | null }) {
  const label = relativeTime(lastVerifiedAt);
  if (!label) return null;

  return <span className="text-xs text-neutral-500">{label}</span>;
}
