export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD") // "café" -> "cafe" + combining accent, which the next step strips
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
