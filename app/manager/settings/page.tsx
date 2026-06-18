"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ManagerSettingsForm } from "@/components/manager/ManagerSettingsForm";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { ManagerSettingsResponse } from "@/types/restaurant-settings";

export default function ManagerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [settingsData, setSettingsData] =
    useState<ManagerSettingsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initializePage() {
      try {
        const session = await getCurrentSession();

        if (!session) {
          window.location.replace("/login");
          return;
        }

        if (session.profile?.global_role === "SUPER_ADMIN") {
          window.location.replace("/master");
          return;
        }

        if (session.restaurantMembership?.role !== "MANAGER") {
          window.location.replace("/login");
          return;
        }

        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession();

        if (!supabaseSession?.access_token) {
          throw new Error("Sessão não encontrada.");
        }

        setAccessToken(supabaseSession.access_token);
        setAllowed(true);

        const response = await fetch("/api/manager/settings", {
          headers: {
            Authorization: `Bearer ${supabaseSession.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message ?? "Erro ao carregar configurações.");
        }

        setSettingsData(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Erro ao carregar configurações.",
        );
      } finally {
        setLoading(false);
      }
    }

    initializePage();
  }, []);

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando configurações...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-orange-400">
              Configurações do Restaurante
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-zinc-400">
              Ajuste identidade visual e regras operacionais do restaurante.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/manager"
              className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-orange-500 hover:text-white"
            >
              Voltar
            </Link>

            <Button
              type="button"
              onClick={handleLogout}
              className="border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white"
            >
              Sair
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        {settingsData && accessToken && (
          <ManagerSettingsForm
            initialData={settingsData}
            accessToken={accessToken}
          />
        )}
      </section>
    </main>
  );
}
