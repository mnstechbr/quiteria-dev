"use client";

import { useEffect, useMemo, useState } from "react";
import { BarOrdersList } from "@/components/bar/BarOrdersList";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import type { OrderItemStatus, ProductionOrder } from "@/types/order";

type BarTab = "summary" | "received" | "progress" | "ready";
type BarItemFilter = "ALL" | OrderItemStatus;

const BAR_TABS: Array<{
  id: BarTab;
  label: string;
  shortLabel: string;
  filter: BarItemFilter;
}> = [
  { id: "summary", label: "Resumo", shortLabel: "Início", filter: "ALL" },
  { id: "received", label: "Recebidos", shortLabel: "Recebidos", filter: "RECEIVED" },
  { id: "progress", label: "Em preparo", shortLabel: "Preparo", filter: "IN_PROGRESS" },
  { id: "ready", label: "Prontos", shortLabel: "Prontos", filter: "READY" },
];

const ITEM_STATUS_ORDER: Record<string, number> = {
  RECEIVED: 0,
  IN_PROGRESS: 1,
  READY: 2,
  WAITING_APPROVAL: 3,
  DELIVERED: 4,
  CANCELLED: 5,
};

function sortOrdersForMobile(orders: ProductionOrder[]) {
  return [...orders].sort((a, b) => {
    const aFirstItemStatus = a.items[0]?.status ?? a.status;
    const bFirstItemStatus = b.items[0]?.status ?? b.status;

    const statusDiff =
      (ITEM_STATUS_ORDER[aFirstItemStatus] ?? 99) -
      (ITEM_STATUS_ORDER[bFirstItemStatus] ?? 99);

    if (statusDiff !== 0) return statusDiff;

    return a.table_name.localeCompare(b.table_name, "pt-BR", { numeric: true });
  });
}

function filterOrdersByItemStatus(
  orders: ProductionOrder[],
  filter: BarItemFilter,
): ProductionOrder[] {
  if (filter === "ALL") {
    return sortOrdersForMobile(orders);
  }

  const filteredOrders = orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) => item.status === filter),
    }))
    .filter((order) => order.items.length > 0);

  return sortOrdersForMobile(filteredOrders);
}

function countItemsByStatus(orders: ProductionOrder[], status: OrderItemStatus) {
  return orders.reduce(
    (total, order) =>
      total + order.items.filter((item) => item.status === status).length,
    0,
  );
}

function getTotalItems(orders: ProductionOrder[]) {
  return orders.reduce((total, order) => total + order.items.length, 0);
}

export default function BarPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [activeTab, setActiveTab] = useState<BarTab>("summary");
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeTabConfig =
    BAR_TABS.find((tab) => tab.id === activeTab) ?? BAR_TABS[0];

  const counters = useMemo(
    () => ({
      total: getTotalItems(orders),
      received: countItemsByStatus(orders, "RECEIVED"),
      progress: countItemsByStatus(orders, "IN_PROGRESS"),
      ready: countItemsByStatus(orders, "READY"),
    }),
    [orders],
  );

  const visibleOrders = useMemo(
    () => filterOrdersByItemStatus(orders, activeTabConfig.filter),
    [activeTabConfig.filter, orders],
  );

  useEffect(() => {
    async function initializePage() {
      try {
        const session = await getCurrentSession();

        if (!session) {
          window.location.replace("/login");
          return;
        }

        const role = session.restaurantMembership?.role;

        if (role !== "MANAGER" && role !== "BAR") {
          window.location.replace("/login");
          return;
        }

        setAllowed(true);
        await loadOrders();
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

  async function loadOrders() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/bar/orders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Erro ao carregar pedidos do bar.");
    }

    setOrders(data.orders ?? []);
  }

  async function refreshOrders() {
    try {
      setRefreshing(true);
      setMessage(null);
      await loadOrders();
      setMessage("Pedidos atualizados.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar pedidos.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  async function updateItem(itemId: string, action: "START_ITEM" | "MARK_READY") {
    try {
      setLoadingItemId(itemId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/bar/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          itemId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao atualizar item.");
      }

      await loadOrders();
      setMessage("Item atualizado com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Erro ao atualizar item.",
      );
    } finally {
      setLoadingItemId(null);
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--q-bg)] px-6 text-center text-sm font-semibold text-white">
        Carregando bar...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[var(--q-bg)] text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-28">
        <header className="sticky top-0 z-30 border-b border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-4 pb-3 pt-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Quitéria
              </p>

              <h1 className="mt-1 truncate text-2xl font-black tracking-tight">
                Bar
              </h1>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--q-muted)]">
                Bebidas e drinks aprovados para preparo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-2xl border border-[color:var(--q-border)] px-3 py-2 text-xs font-bold text-[var(--q-text-soft)] active:scale-[0.98]"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="flex-1 space-y-4 px-4 py-4">
          {message && (
            <div className="rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-4 text-sm leading-relaxed text-[var(--q-text-soft)]">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-2">
            <div className="rounded-3xl border border-orange-300/50 bg-orange-300/10 p-4 shadow-[0_0_18px_rgba(253,186,116,0.10)]">
              <p className="text-xs font-semibold text-orange-100/80">
                Total no bar
              </p>
              <p className="mt-2 text-3xl font-black text-orange-100">
                {counters.total}
              </p>
            </div>

            <div className="rounded-3xl border border-yellow-300/50 bg-yellow-300/10 p-4 shadow-[0_0_18px_rgba(253,224,71,0.10)]">
              <p className="text-xs font-semibold text-yellow-100/80">
                Recebidos
              </p>
              <p className="mt-2 text-3xl font-black text-yellow-100">
                {counters.received}
              </p>
            </div>

            <div className="rounded-3xl border border-sky-300/50 bg-sky-300/10 p-4 shadow-[0_0_18px_rgba(125,211,252,0.10)]">
              <p className="text-xs font-semibold text-sky-100/80">
                Em preparo
              </p>
              <p className="mt-2 text-3xl font-black text-sky-100">
                {counters.progress}
              </p>
            </div>

            <div className="rounded-3xl border border-emerald-300/50 bg-emerald-300/10 p-4 shadow-[0_0_18px_rgba(110,231,183,0.10)]">
              <p className="text-xs font-semibold text-emerald-100/80">
                Prontos
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-100">
                {counters.ready}
              </p>
            </div>
          </section>

          <div className="flex items-center justify-between gap-3 rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-white">
                {activeTabConfig.label}
              </p>
              <p className="mt-0.5 text-xs text-[var(--q-dim)]">
                {visibleOrders.length} pedido(s) visível(is)
              </p>
            </div>

            <button
              type="button"
              disabled={refreshing}
              onClick={refreshOrders}
              className="min-h-11 shrink-0 rounded-2xl border border-[color:var(--q-border)] px-4 text-xs font-black text-[var(--q-text)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <BarOrdersList
            orders={visibleOrders}
            emptyMessage={
              activeTab === "summary"
                ? "Nenhum pedido em produção no momento."
                : `Nenhum item em ${activeTabConfig.label.toLowerCase()} no momento.`
            }
            loadingItemId={loadingItemId}
            onStartItem={(itemId) => updateItem(itemId, "START_ITEM")}
            onMarkReady={(itemId) => updateItem(itemId, "MARK_READY")}
          />
        </section>

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--q-border)] bg-[rgba(8,13,11,0.94)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
            {BAR_TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-h-14 rounded-2xl px-2 text-xs font-black transition active:scale-[0.98] ${
                    isActive
                      ? "bg-emerald-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.20)]"
                      : "border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] text-[var(--q-muted)]"
                  }`}
                >
                  {tab.shortLabel}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
