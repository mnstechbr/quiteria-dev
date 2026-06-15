"use client";

import { useEffect, useState } from "react";
import { getCurrentSession } from "@/lib/auth/session-service";
import { isSuperAdmin } from "@/lib/auth/profile-service";

export default function MasterPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const session = await getCurrentSession();

      if (!session) {
        window.location.href = "/login";
        return;
      }

      if (!isSuperAdmin(session.profile)) {
        window.location.href = "/login";
        return;
      }

      setUserName(session.profile?.full_name ?? session.user.email ?? "Usuário");
      setAllowed(true);
      setLoading(false);
    }

    checkAccess();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando painel...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-medium text-orange-400">Painel Master</p>

        <h1 className="mt-2 text-4xl font-bold tracking-tight">
          Quitéria
        </h1>

        <p className="mt-3 text-zinc-400">
          Bem-vindo, {userName}. Aqui você gerenciará todos os restaurantes da plataforma.
        </p>
      </section>
    </main>
  );
}