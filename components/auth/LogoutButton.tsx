"use client";

import { signOut } from "@/lib/auth/auth-service";

export function LogoutButton() {
  async function handleLogout() {
    await signOut();
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-xl border border-[color:var(--q-border)] px-4 py-2 text-sm text-[var(--q-text-soft)] transition hover:border-emerald-500 hover:text-white"
    >
      Sair
    </button>
  );
}