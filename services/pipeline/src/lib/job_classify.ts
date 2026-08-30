// Lightweight keyword inference from a job title — neither Greenhouse nor
// Lever exposes a clean, consistent field/seniority taxonomy across every
// company's board, so this is a best-effort tag for filtering, not a
// sourced fact. Mirrors the field/level buckets shown in the reference UI
// (Engineering, Data & AI, Product, Design, Sales & Marketing, Operations,
// Other / Fresher, Junior, Mid, Senior, Lead).
const TRACK_KEYWORDS: Array<[string, RegExp]> = [
  ["Data & AI", /data scien|machine learning|\bml\b|\bai\b|analytics|data engineer/i],
  ["Engineering", /engineer|developer|\bsde\b|backend|front.?end|full.?stack|devops|\bsre\b|\bqa\b/i],
  ["Product", /product manager|product owner|\bpm\b/i],
  ["Design", /designer|\bux\b|\bui\b/i],
  ["Sales & Marketing", /sales|marketing|growth|business development|\bbd\b/i],
  ["Operations", /operations|\bops\b|supply chain|logistics/i],
];

export function inferTrack(title: string): string {
  for (const [track, pattern] of TRACK_KEYWORDS) {
    if (pattern.test(title)) return track;
  }
  return "Other";
}

export function inferSeniority(title: string): { seniority: string; fresherFriendly: boolean } {
  if (/intern|graduate|trainee|fresher/i.test(title)) return { seniority: "Fresher", fresherFriendly: true };
  if (/senior|staff|principal|\bsr\.?\b/i.test(title)) return { seniority: "Senior", fresherFriendly: false };
  if (/\blead\b|head of|manager|director|\bvp\b/i.test(title)) return { seniority: "Lead", fresherFriendly: false };
  if (/junior|associate|\bjr\.?\b/i.test(title)) return { seniority: "Junior", fresherFriendly: false };
  return { seniority: "Mid", fresherFriendly: false };
}
