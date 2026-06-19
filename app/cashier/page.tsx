"use client";

import { useEffect, useState } from "react";
import {
  CashierBill,
  CashierSettings,
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
  const [cashierSettings, setCashierSettings] = useState<CashierSettings>({
    defaultServicePercent: 0,
    allowCashierServicePercentEdit: true,
  });
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
    setCashierSettings({
      defaultServicePercent: Number(data.settings?.defaultServicePercent ?? 0),
      allowCashierServicePercentEdit:
        data.settings?.allowCashierServicePercentEdit ?? true,
    });
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
      <main className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-[var(--q-bg)] px-4 text-center text-sm text-[var(--q-text-soft)]">
        Carregando caixa...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[var(--q-bg)] text-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
              Caixa
            </p>
            <h1 className="truncate text-lg font-bold leading-tight text-white">
              Quitéria
            </h1>
          </div>

          <Button
            type="button"
            onClick={handleLogout}
            className="shrink-0 border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-3 py-2 text-xs text-[var(--q-text-soft)] hover:border-emerald-500 hover:bg-[rgba(17,28,24,0.86)] hover:text-white"
          >
            Sair
          </Button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        <div className="rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-5 shadow-2xl shadow-black/20">
          <p className="text-sm text-[var(--q-muted)]">Bem-vindo, {userName}.</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Controle do caixa
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--q-muted)]">
            Acompanhe mesas, contas solicitadas, taxa de serviço e fechamento de pagamentos.
          </p>
        </div>

        {message && (
          <div className="mt-4 rounded-2xl border border-orange-400/30 bg-orange-400/10 p-4 text-sm leading-6 text-orange-100">
            {message}
          </div>
        )}

        <CashierTableList
          tables={tables}
          bills={bills}
          settings={cashierSettings}
          closingSessionId={closingSessionId}
          onCloseBill={handleCloseBill}
        />
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-4 py-3 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2 text-center text-[11px] font-semibold text-[var(--q-text-soft)]">
          <a
            href="#cashier-overview"
            className="rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-2 py-3 hover:border-emerald-500 hover:text-white"
          >
            Início
          </a>
          <a
            href="#cashier-bills"
            className="rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-2 py-3 hover:border-emerald-500 hover:text-white"
          >
            Contas
          </a>
          <a
            href="#cashier-tables"
            className="rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] px-2 py-3 hover:border-emerald-500 hover:text-white"
          >
            Mesas
          </a>
        </div>
      </nav>
    </main>
  );
}
