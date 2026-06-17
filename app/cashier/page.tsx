"use client";

import { useEffect, useState } from "react";
import {
  CashierBill,
  CashierTableList,
} from "@/components/cashier/CashierTableList";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { TableWithStatus } from "@/types/table";

const ALLOWED_CASHIER_ROLES = ["MANAGER", "CASHIER"];

export default function CashierPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState("");
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [bills, setBills] = useState<CashierBill[]>([]);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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

        const role = session.restaurantMembership?.role;

        if (!role || !ALLOWED_CASHIER_ROLES.includes(role)) {
          window.location.replace("/login");
          return;
        }

        setUserName(session.profile?.full_name ?? session.user.email ?? "Caixa");
        setAllowed(true);

        await loadCashierData();
      } catch {
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    initializePage();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada.");
    }

    return session.access_token;
  }

  async function loadCashierData() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/cashier/tables", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Erro ao carregar caixa.");
    }

    setTables(data.tables ?? []);
    setBills(data.bills ?? []);
  }

  async function handleCloseBill(
    sessionId: string,
    paymentMethod: string,
    servicePercent: number,
  ) {
    try {
      setMessage(null);
      setClosingSessionId(sessionId);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/cashier/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "CLOSE_BILL",
          sessionId,
          paymentMethod,
          servicePercent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao fechar conta.");
      }

      setMessage("Pagamento finalizado e mesa liberada com sucesso.");
      await loadCashierData();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao fechar conta.",
      );
    } finally {
      setClosingSessionId(null);
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando caixa...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-400">Caixa</p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-zinc-400">Bem-vindo, {userName}.</p>
          </div>

          <Button
            type="button"
            onClick={handleLogout}
            className="border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white"
          >
            Sair
          </Button>
        </div>

        {message && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
            {message}
          </div>
        )}

        <CashierTableList
          tables={tables}
          bills={bills}
          closingSessionId={closingSessionId}
          onCloseBill={handleCloseBill}
        />
      </section>
    </main>
  );
}
