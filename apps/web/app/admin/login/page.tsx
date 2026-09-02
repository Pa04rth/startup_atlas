"use client";

import { useState, type FormEvent } from "react";

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d0d0d] px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-[#1a1a19] p-8 shadow-lg"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#3987e5] text-sm font-bold text-white">
            S
          </span>
          <h1 className="text-lg font-semibold text-white">Startup Atlas Admin</h1>
        </div>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-[#898781] focus:border-[#3987e5] focus:outline-none focus:ring-2 focus:ring-[#3987e5]/30"
        />
        {error && <p className="text-sm text-[#e46b6b]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full rounded-lg bg-[#3987e5] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#2a78d6] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Checking…" : "Log in"}
        </button>
      </form>

      <a href="/" className="text-sm text-[#898781] transition hover:text-white">
        ← Back to site
      </a>
    </div>
  );
}
