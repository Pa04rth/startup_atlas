"use client";

import { useState, type FormEvent } from "react";
import { Cormorant_Garamond, Lora } from "next/font/google";

// Login sits outside the (panel) route group, so it loads the classical
// fonts itself rather than inheriting them from the panel layout.
const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-heading" });
const lora = Lora({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-body" });

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);
    if (res.ok) {
      window.location.href = "/admin";
    } else {
      setError("Wrong password.");
    }
  }

  return (
    <div
      className={`${cormorant.variable} ${lora.variable} flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f3f2f2] px-4 text-[#201f1d]`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-md border border-[#201f1d]/12 bg-[#f8f4f4] p-8"
      >
        <div>
          <h1 className="text-[22px]" style={{ fontFamily: "var(--font-heading)" }}>
            Startup Atlas.
          </h1>
          <p className="mt-1 text-[10.5px] uppercase tracking-[0.16em] text-[#7d5411]">Admin</p>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-sm border border-[#201f1d]/16 bg-[#f3f2f2] px-3 py-2 text-sm text-[#201f1d] placeholder:text-[#9b9797] focus:border-[#b68235] focus:outline-none focus:ring-2 focus:ring-[#b68235]/25"
        />
        {error && <p className="text-sm text-[#b3402c]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-sm bg-[#2d2b2b] px-3 py-2.5 text-sm font-medium text-[#f8f4f4] transition hover:bg-[#201f1d] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
      </form>

      <a href="/" className="text-sm text-[#7d7979] no-underline transition hover:text-[#201f1d]">
        ← Back to site
      </a>
    </div>
  );
}
