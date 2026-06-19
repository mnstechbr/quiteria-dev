"use client";

import { useEffect, useMemo, useState } from "react";
import { PendingOrdersList } from "@/components/manager/PendingOrdersList";
import { ReadyOrdersList } from "@/components/waiter/ReadyOrdersList";
import { WaiterTableGrid } from "@/components/waiter/WaiterTableGrid";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { PendingOrder } from "@/types/order";
import { TableOperationalStatus, TableWithStatus } from "@/types/table";

const ALLOWED_WAITER_ROLES = ["MANAGER", "WAITER"];

type WaiterTab = "summary" | "pending" | "ready" | "tables";
type TableFilter = "ALL" | TableOperationalStatus;

const WAITER_TABS: Array<{
  id: WaiterTab;
  label: string;
  shortLabel: string;
  icon: string;
}> = [
  { id: "summary", label: "Resumo", shortLabel: "Início", icon: "IN" },
  { id: "pending", label: "Aprovações", shortLabel: "Aprovar", icon: "AP" },
  { id: "ready", label: "Entregas", shortLabel: "Prontos", icon: "PR" },
  { id: "tables", label: "Mesas", shortLabel: "Mesas", icon: "ME" },
];

const TABLE_FILTERS: Array<{
  id: TableFilter;
  label: string;
  countKey?: keyof ReturnType<typeof createEmptyTableCounters>;
}> = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING_APPROVAL", label: "Aprovar", countKey: "pending" },
  { id: "OPEN", label: "Atendimento", countKey: "open" },
  { id: "BILL_REQUESTED", label: "Conta", countKey: "bill" },
  { id: "AVAILABLE", label: "Livres", countKey: "available" },
];

const TABLE_STATUS_ORDER: Record<TableOperationalStatus, number> = {
  BILL_REQUESTED: 0,
  PENDING_APPROVAL: 1,
  OPEN: 2,
  AVAILABLE: 3,
  CLOSED: 4,
};

function createEmptyTableCounters() {
  return {
    available: 0,
    pending: 0,
    open: 0,
    bill: 0,
  };
}

function getStatusCount(tables: TableWithStatus[], status: TableOperationalStatus) {
  return tables.filter((table) => table.operational_status === status).length;
}

function sortTablesForMobile(tables: TableWithStatus[]) {
  return [...tables].sort((a, b) => {
    const statusDiff =
      TABLE_STATUS_ORDER[a.operational_status] -
      TABLE_STATUS_ORDER[b.operational_status];

    if (statusDiff !== 0) return statusDiff;

    return a.name.localeCompare(b.name, "pt-BR", { numeric: true });
  });
}

export default function WaiterPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [activeTab, setActiveTab] = useState<WaiterTab>("summary");
  const [tableFilter, setTableFilter] = useState<TableFilter>("ALL");
  const [userName, setUserName] = useState("");
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [readyOrders, setReadyOrders] = useState<PendingOrder[]>([]);

  const [approvingTableId, setApprovingTableId] = useState<string | null>(null);
  const [requestingBillTableId, setRequestingBillTableId] = useState<string | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tableCounters = useMemo(
    () => ({
      available: getStatusCount(tables, "AVAILABLE"),
      pending: getStatusCount(tables, "PENDING_APPROVAL"),
      open: getStatusCount(tables, "OPEN"),
      bill: getStatusCount(tables, "BILL_REQUESTED"),
    }),
    [tables],
  );

  const filteredTables = useMemo(() => {
    const visibleTables =
      tableFilter === "ALL"
        ? tables
        : tables.filter((table) => table.operational_status === tableFilter);

    return sortTablesForMobile(visibleTables);
  }, [tableFilter, tables]);

  const activeTabLabel = WAITER_TABS.find((tab) => tab.id === activeTab)?.label;

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

        if (!role || !ALLOWED_WAITER_ROLES.includes(role)) {
          window.location.replace("/login");
          return;
        }

        setUserName(session.profile?.full_name ?? session.user.email ?? "Garçom");
        setAllowed(true);

        await refreshAll();
      } catch {
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    initializePage();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada.");
    }

    return session.access_token;
  }

  async function fetchJson(path: string) {
    const accessToken = await getAccessToken();

    const response = await fetch(path, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Erro ao carregar dados.");
    }

    return data;
  }

  async function refreshAll() {
    await Promise.allSettled([
      loadTables(),
      loadPendingOrders(),
      loadReadyOrders(),
    ]);
  }

  async function loadTables() {
    const data = await fetchJson("/api/waiter/tables");
    setTables(data.tables ?? []);
  }

  async function loadPendingOrders() {
    const data = await fetchJson("/api/waiter/orders");
    setPendingOrders(data.orders ?? []);
  }

  async function loadReadyOrders() {
    const data = await fetchJson("/api/waiter/orders?view=READY_FOR_DELIVERY");
    setReadyOrders(data.orders ?? []);
  }

  async function updateTableStatus({
    tableId,
    action,
    loadingSetter,
    successMessage,
  }: {
    tableId: string;
    action: "APPROVE_SESSION" | "REQUEST_BILL";
    loadingSetter: (tableId: string | null) => void;
    successMessage: string;
  }) {
    try {
      loadingSetter(tableId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/waiter/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tableId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao atualizar mesa.");
      }

      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                operational_status:
                  data.table?.operational_status ?? table.operational_status,
                active_session_id:
                  data.table?.active_session_id ?? table.active_session_id,
              }
            : table,
        ),
      );

      setMessage(successMessage);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar mesa.",
      );
    } finally {
      loadingSetter(null);
    }
  }

  async function handleApproveOrder(orderId: string) {
    try {
      setApprovingOrderId(orderId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/waiter/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orderId,
          action: "APPROVE_ORDER",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao aprovar pedido.");
      }

      setPendingOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== orderId),
      );

      await Promise.allSettled([
        loadTables(),
        loadReadyOrders(),
      ]);

      setMessage("Pedido aprovado e enviado para produção.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao aprovar pedido.",
      );
    } finally {
      setApprovingOrderId(null);
    }
  }

  async function handleMarkDelivered(orderId: string) {
    try {
      setDeliveringOrderId(orderId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/waiter/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orderId,
          action: "MARK_DELIVERED",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao marcar entrega.");
      }

      setReadyOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== orderId),
      );

      setMessage("Pedido marcado como entregue.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao marcar entrega.",
      );
    } finally {
      setDeliveringOrderId(null);
    }
  }

  function handleApproveTableSession(tableId: string) {
    updateTableStatus({
      tableId,
      action: "APPROVE_SESSION",
      loadingSetter: setApprovingTableId,
      successMessage: "Mesa aprovada com sucesso.",
    });
  }

  function handleRequestBill(tableId: string) {
    updateTableStatus({
      tableId,
      action: "REQUEST_BILL",
      loadingSetter: setRequestingBillTableId,
      successMessage: "Solicitação de conta registrada.",
    });
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-[var(--q-bg)] px-6 text-center text-sm text-[var(--q-text-soft)]">
        Carregando painel do garçom...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[var(--q-bg-outer)] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-hidden bg-[var(--q-bg)]">
        <header className="sticky top-0 z-40 shrink-0 border-b border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-300">
                Painel do garçom
              </p>
              <h1 className="mt-1 truncate text-2xl font-black leading-tight">
                Quitéria
              </h1>
              <p className="mt-1 truncate text-xs text-[var(--q-muted)]">
                {activeTabLabel} • {userName}
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

          {message && (
            <div className="mt-3 rounded-2xl border border-orange-400/30 bg-orange-400/10 px-3 py-2 text-xs leading-relaxed text-orange-100">
              {message}
            </div>
          )}
        </header>

        <section className="flex-1 space-y-4 px-4 py-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))]">
          {activeTab === "summary" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Aprovar" value={pendingOrders.length} />
                <SummaryCard label="Prontos" value={readyOrders.length} />
                <SummaryCard label="Em atendimento" value={tableCounters.open} />
                <SummaryCard label="Conta" value={tableCounters.bill} />
              </div>

              <div className="rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold">Fila de atendimento</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--q-muted)]">
                      Ações principais em cards grandes, com um único scroll vertical.
                    </p>
                  </div>
                  <span className="rounded-full border border-[color:var(--q-border)] px-2.5 py-1 text-[10px] text-[var(--q-text-soft)]">
                    {tables.length} mesas
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  <QuickActionButton
                    label="Aprovar pedidos"
                    detail={`${pendingOrders.length} pedido(s) aguardando aprovação`}
                    onClick={() => setActiveTab("pending")}
                  />
                  <QuickActionButton
                    label="Entregar pedidos prontos"
                    detail={`${readyOrders.length} pedido(s) pronto(s) para entregar`}
                    onClick={() => setActiveTab("ready")}
                  />
                  <QuickActionButton
                    label="Acompanhar mesas"
                    detail={`${tableCounters.pending} aguardando • ${tableCounters.open} em atendimento`}
                    onClick={() => setActiveTab("tables")}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "pending" && (
            <div className="space-y-4">
              <SectionHeader
                title="Aprovações"
                description="Aprove os pedidos dos clientes antes de enviar para produção."
                actionLabel="Atualizar"
                onAction={() => loadPendingOrders().catch(() => null)}
              />

              <PendingOrdersList
                orders={pendingOrders}
                approvingOrderId={approvingOrderId}
                onApproveOrder={handleApproveOrder}
              />
            </div>
          )}

          {activeTab === "ready" && (
            <div className="space-y-4">
              <SectionHeader
                title="Entregas"
                description="Marque como entregue quando levar o pedido para a mesa."
                actionLabel="Atualizar"
                onAction={() => loadReadyOrders().catch(() => null)}
              />

              <ReadyOrdersList
                orders={readyOrders}
                deliveringOrderId={deliveringOrderId}
                onMarkDelivered={handleMarkDelivered}
              />
            </div>
          )}

          {activeTab === "tables" && (
            <div className="space-y-4">
              <SectionHeader
                title="Mesas"
                description="Acompanhe aprovações, atendimento e solicitações de conta."
                actionLabel="Atualizar"
                onAction={() => loadTables().catch(() => null)}
              />

              <div className="grid grid-cols-2 gap-2">
                <SummaryCard label="Livres" value={tableCounters.available} compact />
                <SummaryCard label="Aprovar" value={tableCounters.pending} compact />
                <SummaryCard label="Atendimento" value={tableCounters.open} compact />
                <SummaryCard label="Conta" value={tableCounters.bill} compact />
              </div>

              <div className="flex flex-wrap gap-2">
                {TABLE_FILTERS.map((filter) => {
                  const isActive = tableFilter === filter.id;
                  const count = filter.countKey ? tableCounters[filter.countKey] : tables.length;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setTableFilter(filter.id)}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                        isActive
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] text-[var(--q-text-soft)]"
                      }`}
                    >
                      {filter.label} <span className="opacity-80">{count}</span>
                    </button>
                  );
                })}
              </div>

              {filteredTables.length === 0 ? (
                <EmptyMobileState text="Nenhuma mesa encontrada nesse filtro." />
              ) : (
                <WaiterTableGrid
                  tables={filteredTables}
                  approvingTableId={approvingTableId}
                  requestingBillTableId={requestingBillTableId}
                  onApproveSession={handleApproveTableSession}
                  onRequestBill={handleRequestBill}
                />
              )}
            </div>
          )}
        </section>

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="grid grid-cols-4 gap-1">
            {WAITER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 rounded-2xl px-1 py-2 text-center text-[10px] font-semibold transition active:scale-95 ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-[0_0_18px_rgba(34,197,94,0.20)]"
                      : "text-[var(--q-muted)]"
                  }`}
                >
                  <span className="block text-base leading-none">{tab.icon}</span>
                  <span className="mt-1 block truncate leading-tight">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] ${compact ? "p-3" : "p-4"}`}>
      <p className="truncate text-xs text-[var(--q-muted)]">{label}</p>
      <p className={`${compact ? "mt-1 text-xl" : "mt-2 text-2xl"} truncate font-black text-white`}>
        {value}
      </p>
    </div>
  );
}

function QuickActionButton({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.72)] p-4 text-left transition active:scale-[0.99]"
    >
      <span className="block text-sm font-bold text-white">{label}</span>
      <span className="mt-1 block text-xs leading-relaxed text-[var(--q-muted)]">
        {detail}
      </span>
    </button>
  );
}

function SectionHeader({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black leading-tight">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-[var(--q-muted)]">{description}</p>
        </div>
        {actionLabel && onAction && (
          <Button type="button" onClick={onAction} className="shrink-0 px-3 py-2 text-xs">
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyMobileState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--q-border)] bg-[rgba(13,21,18,0.74)] p-6 text-center">
      <p className="text-sm text-[var(--q-muted)]">{text}</p>
    </div>
  );
}
