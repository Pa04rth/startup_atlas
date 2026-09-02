import Image from "next/image";

function XIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.783 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-1.337-.024-3.059-1.865-3.059-1.865 0-2.151 1.459-2.151 2.964v5.699h-3v-11h2.881v1.504h.041c.401-.76 1.381-1.562 2.842-1.562 3.039 0 3.601 2.001 3.601 4.604v6.454z" />
    </svg>
  );
}

// Kushal's X profile isn't set up yet — no link to omit rather than guess
// at or fake one; add it here once given.
//
// `compact` drops the icon links and "By"/"and" filler words down to just
// the two names — used on mobile, where this badge shares the bottom row
// with the startup-count badge on the opposite corner and the full version
// (avatar + 4 icon links) doesn't fit both on screen at once.
export function DeveloperCredit({
  avatarSize = 24,
  iconSize = 14,
  compact = false,
}: {
  avatarSize?: number;
  iconSize?: number;
  compact?: boolean;
}) {
  if (compact) {
    // No avatar image here — every pixel counts on the badge this shares a
    // row with (the startup-count badge, opposite corner) at phone widths.
    return (
      <>
        <a
          href="https://x.com/ParthSohaney04"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-700 hover:underline"
        >
          Parth
        </a>
        <span>&amp;</span>
        <a
          href="https://www.linkedin.com/in/kushal-gupta-77949118a/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-700 hover:underline"
        >
          Kushal
        </a>
      </>
    );
  }

  return (
    <>
      <Image
        src="/me.png"
        alt="Parth Sohaney"
        width={avatarSize}
        height={avatarSize}
        className="rounded-full border border-neutral-200 object-cover"
      />
      <span>
        By <span className="font-medium text-neutral-700">Parth</span>
      </span>
      <a
        href="https://x.com/ParthSohaney04"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Parth Sohaney on X"
        className="text-neutral-400 transition hover:text-neutral-700"
      >
        <XIcon size={iconSize} />
      </a>
      <a
        href="https://www.linkedin.com/in/parthsohaney/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Parth Sohaney on LinkedIn"
        className="text-neutral-400 transition hover:text-neutral-700"
      >
        <LinkedInIcon size={iconSize} />
      </a>
      <span>
        and <span className="font-medium text-neutral-700">Kushal</span>
      </span>
      <a
        href="https://www.linkedin.com/in/kushal-gupta-77949118a/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Kushal Gupta on LinkedIn"
        className="text-neutral-400 transition hover:text-neutral-700"
      >
        <LinkedInIcon size={iconSize} />
      </a>
    </>
  );
}
