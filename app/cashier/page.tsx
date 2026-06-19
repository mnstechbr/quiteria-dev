"use client";

import { useEffect, useState } from "react";
import {
  CashierBill,
  CashierSettings,
  CashierTableList,
} from "@/components/cashier/CashierTableList";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { TableWithStatus } from "@/types/table";

const ALLOWED_CASHIER_ROLES = ["MANAGER", "CASHIER"];

type CashierNav = "overview" | "bills" | "tables";

const CASHIER_NAV_ITEMS: Array<{
  id: CashierNav;
  label: string;
  shortLabel: string;
  icon: string;
  target: string;
}> = [
  { id: "overview", label: "Início", shortLabel: "Início", icon: "IN", target: "cashier-overview" },
  { id: "bills", label: "Contas", shortLabel: "Contas", icon: "CT", target: "cashier-bills" },
  { id: "tables", label: "Mesas", shortLabel: "Mesas", icon: "ME", target: "cashier-tables" },
];

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
  const [activeNav, setActiveNav] = useState<CashierNav>("overview");

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

  function handleNavClick(item: (typeof CASHIER_NAV_ITEMS)[number]) {
    setActiveNav(item.id);
    document.getElementById(item.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="q-page flex min-h-dvh items-center justify-center px-4 text-center text-sm text-[var(--q-text-soft)]">
        Carregando caixa...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[var(--q-bg-outer)] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-hidden bg-[var(--q-bg)]">
        <header className="sticky top-0 z-40 shrink-0 border-b border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                Painel do caixa
              </p>
              <h1 className="mt-1 truncate text-2xl font-black leading-tight">
                Quitéria
              </h1>
              <p className="mt-1 truncate text-xs text-[var(--q-muted)]">
                {CASHIER_NAV_ITEMS.find((item) => item.id === activeNav)?.label} • {userName}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-2xl border border-[color:var(--q-border)] px-3 py-2 text-xs font-semibold text-[var(--q-text-soft)] transition active:scale-95"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="flex-1 space-y-4 px-4 py-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))]">
        <div className="q-hero p-5">
          <p className="text-sm text-[var(--q-muted)]">Bem-vindo, {userName}.</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Controle do caixa
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--q-muted)]">
            Acompanhe mesas, contas solicitadas, taxa de serviço e fechamento de pagamentos.
          </p>
        </div>

        {message && (
          <div className="q-toast mt-4 p-4 text-sm leading-6">
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

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="grid grid-cols-3 gap-1">
            {CASHIER_NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => handleNavClick(item)}
                  className={`min-w-0 rounded-2xl px-1 py-2 text-center text-[10px] font-semibold transition active:scale-95 ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-[0_0_18px_rgba(34,197,94,0.20)]"
                      : "text-[var(--q-muted)]"
                  }`}
                >
                  <span className="block text-base leading-none">{item.icon}</span>
                  <span className="mt-1 block truncate leading-tight">{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
