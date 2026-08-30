// Shared with CompanyLogo.tsx (DOM) and MapView.tsx (MapLibre paint
// expressions) so a brand's fallback color is identical everywhere it
// appears — deliberately excludes white/black, since those are reserved for
// the badge background and precision-trust stroke respectively, not brand
// identity.
export const AVATAR_COLORS = [
  "#0c7a5e", "#2f6ea6", "#b75811", "#7c3aed", "#be185d", "#0f766e", "#b91c1c", "#4338ca",
];

export function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
