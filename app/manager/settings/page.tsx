"use client";

import { useEffect, useState } from "react";
import {
  ManagerMobileShell,
  MobileMessage,
  MobileSectionCard,
} from "@/components/manager/ManagerMobileShell";
import { ManagerSettingsForm } from "@/components/manager/ManagerSettingsForm";
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
      <main className="flex min-h-screen items-center justify-center bg-[var(--q-bg)] px-6 text-center text-sm text-white">
        Carregando configurações...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <ManagerMobileShell
      title="Configurações"
      description="Identidade visual, regras de aprovação e taxa de serviço do restaurante."
      activeHref="/manager/settings"
      onLogout={handleLogout}
    >
      {errorMessage && <MobileMessage message={errorMessage} />}

      {settingsData && accessToken && (
        <MobileSectionCard
          title="Restaurante"
          description="Formulário em blocos verticais para edição segura pelo celular."
        >
          <ManagerSettingsForm
            initialData={settingsData}
            accessToken={accessToken}
          />
        </MobileSectionCard>
      )}
    </ManagerMobileShell>
  );
}
