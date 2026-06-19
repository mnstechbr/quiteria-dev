"use client";

import { useEffect, useMemo, useState } from "react";
import { KitchenOrdersList } from "@/components/kitchen/KitchenOrdersList";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import type { OrderItemStatus, ProductionOrder } from "@/types/order";

type KitchenTab = "summary" | "received" | "progress" | "ready";
type KitchenItemFilter = "ALL" | OrderItemStatus;

const KITCHEN_TABS: Array<{
  id: KitchenTab;
  label: string;
  shortLabel: string;
  filter: KitchenItemFilter;
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
  filter: KitchenItemFilter,
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

export default function KitchenPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [activeTab, setActiveTab] = useState<KitchenTab>("summary");
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const activeTabConfig =
    KITCHEN_TABS.find((tab) => tab.id === activeTab) ?? KITCHEN_TABS[0];

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

        if (role !== "MANAGER" && role !== "KITCHEN") {
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

    const response = await fetch("/api/kitchen/orders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Erro ao carregar pedidos da cozinha.");
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

      const response = await fetch("/api/kitchen/orders", {
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
      <main className="q-page flex min-h-dvh items-center justify-center px-6 text-center text-sm font-semibold text-[var(--q-text-soft)]">
        Carregando cozinha...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="q-page">
      <div className="q-mobile-frame flex min-h-dvh flex-col pb-28">
        <header className="q-topbar sticky top-0 z-30 px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                Quitéria
              </p>

              <h1 className="mt-1 truncate text-2xl font-black tracking-tight">
                Cozinha
              </h1>

              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--q-muted)]">
                Pedidos aprovados e enviados para preparo.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="q-action-secondary shrink-0 rounded-2xl px-3 py-2 text-xs font-bold active:scale-[0.98]"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="flex-1 space-y-4 px-4 py-4">
          {message && (
            <div className="q-toast p-4 text-sm leading-relaxed">
              {message}
            </div>
          )}

          <section className="grid grid-cols-2 gap-2">
            <div className="q-metric q-metric-orange p-4">
              <p className="text-xs font-semibold text-orange-100/80">
                Total na cozinha
              </p>
              <p className="mt-2 text-3xl font-black text-orange-100">
                {counters.total}
              </p>
            </div>

            <div className="q-metric q-metric-yellow p-4">
              <p className="text-xs font-semibold text-yellow-100/80">
                Recebidos
              </p>
              <p className="mt-2 text-3xl font-black text-yellow-100">
                {counters.received}
              </p>
            </div>

            <div className="q-metric q-metric-blue p-4">
              <p className="text-xs font-semibold text-sky-100/80">
                Em preparo
              </p>
              <p className="mt-2 text-3xl font-black text-sky-100">
                {counters.progress}
              </p>
            </div>

            <div className="q-metric q-metric-green p-4">
              <p className="text-xs font-semibold text-emerald-100/80">
                Prontos
              </p>
              <p className="mt-2 text-3xl font-black text-emerald-100">
                {counters.ready}
              </p>
            </div>
          </section>

          <div className="q-panel flex items-center justify-between gap-3 p-3">
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
              className="q-action-secondary min-h-11 shrink-0 rounded-2xl px-4 text-xs font-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>

          <KitchenOrdersList
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

        <nav className="q-bottom-nav fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-2">
            {KITCHEN_TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`q-bottom-nav-item px-2 text-xs font-black ${
                    isActive ? "q-bottom-nav-item-active" : ""
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
