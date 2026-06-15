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
      className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-orange-500 hover:text-white"
    >
      Sair
    </button>
  );
}