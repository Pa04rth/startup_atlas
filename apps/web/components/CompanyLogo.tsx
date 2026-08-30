"use client";

import { useState } from "react";
import { colorFor } from "@/lib/avatarColor";

// A logo image that degrades to a visible initials avatar on failure,
// instead of disappearing — a hotlinked favicon can fail for reasons that
// have nothing to do with the data being wrong (an ad-blocker flagging the
// icon host, a network hiccup), and hiding it silently reads as "this
// product has no logos at all," which is worse than a plain initial.
export function CompanyLogo({ src, name, className }: { src: string | null; name: string; className: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={className + " flex items-center justify-center font-semibold text-white"}
        style={{ backgroundColor: colorFor(name) }}
        aria-hidden="true"
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={className + " object-contain"} loading="lazy" onError={() => setFailed(true)} />
  );
}
