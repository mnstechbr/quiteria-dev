"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ManagerDashboard,
  ManagerDashboardData,
} from "@/components/manager/ManagerDashboard";
import { PendingOrdersList } from "@/components/manager/PendingOrdersList";
import { ProductList } from "@/components/manager/ProductList";
import { CreateProductForm } from "@/components/manager/CreateProductForm";
import { CategoryList } from "@/components/manager/CategoryList";
import { CreateCategoryForm } from "@/components/manager/CreateCategoryForm";
import { TableQrActions, TableQrModal } from "@/components/manager/TableQrTools";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { PendingOrder } from "@/types/order";
import { Product } from "@/types/product";
import { Restaurant } from "@/types/restaurant";
import { TableOperationalStatus, TableWithStatus } from "@/types/table";

type ManagerTab =
  | "summary"
  | "tables"
  | "orders"
  | "products"
  | "categories"
  | "settings";

type TableFilter = "ALL" | TableOperationalStatus;

type ManagerRestaurantOverview = {
  restaurant: Restaurant;
  tablesCount: number;
  categoriesCount: number;
};

type TableAction = "APPROVE_SESSION" | "REQUEST_BILL" | "CLOSE_SESSION";

const MANAGER_TABS: Array<{
  id: ManagerTab;
  label: string;
  shortLabel: string;
  icon: string;
}> = [
  { id: "summary", label: "Resumo", shortLabel: "Início", icon: "🏠" },
  { id: "tables", label: "Mesas", shortLabel: "Mesas", icon: "🪑" },
  { id: "orders", label: "Pedidos", shortLabel: "Pedidos", icon: "📋" },
  { id: "products", label: "Produtos", shortLabel: "Itens", icon: "🍔" },
  { id: "categories", label: "Categorias", shortLabel: "Cat.", icon: "📂" },
  { id: "settings", label: "Configurações", shortLabel: "Config", icon: "⚙️" },
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function getStatusInfo(status: TableOperationalStatus) {
  if (status === "PENDING_APPROVAL") {
    return {
      label: "Aguardando aprovação",
      dot: "bg-yellow-300",
      card: "border-yellow-300/60 bg-yellow-300/10",
      text: "text-yellow-200",
      actionTone: "yellow",
    };
  }

  if (status === "OPEN") {
    return {
      label: "Em atendimento",
      dot: "bg-sky-300",
      card: "border-sky-300/60 bg-sky-300/10",
      text: "text-sky-200",
      actionTone: "red",
    };
  }

  if (status === "BILL_REQUESTED") {
    return {
      label: "Conta solicitada",
      dot: "bg-red-400",
      card: "border-red-400/60 bg-red-400/10",
      text: "text-red-200",
      actionTone: "green",
    };
  }

  return {
    label: "Disponível",
    dot: "bg-emerald-300",
    card: "border-emerald-300/50 bg-emerald-300/10",
    text: "text-emerald-200",
    actionTone: "neutral",
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

export default function ManagerPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [activeTab, setActiveTab] = useState<ManagerTab>("summary");
  const [tableFilter, setTableFilter] = useState<TableFilter>("ALL");
  const [userName, setUserName] = useState("");
  const [overview, setOverview] = useState<ManagerRestaurantOverview | null>(
    null,
  );
  const [dashboard, setDashboard] = useState<ManagerDashboardData | null>(null);
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [message, setMessage] = useState<string | null>(null);
  const [approvingTableId, setApprovingTableId] = useState<string | null>(null);
  const [requestingBillTableId, setRequestingBillTableId] = useState<string | null>(null);
  const [closingTableId, setClosingTableId] = useState<string | null>(null);
  const [regeneratingQrTableId, setRegeneratingQrTableId] = useState<string | null>(null);
  const [regeneratingAllQrs, setRegeneratingAllQrs] = useState(false);
  const [qrModalTable, setQrModalTable] = useState<TableWithStatus | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);

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

  const activeTabLabel = MANAGER_TABS.find((tab) => tab.id === activeTab)?.label;

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

        setUserName(session.profile?.full_name ?? session.user.email ?? "Gerente");
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
      loadDashboard(),
      loadRestaurantOverview(),
      loadTables(),
      loadPendingOrders(),
      loadProducts(),
      loadCategories(),
    ]);
  }

  async function loadDashboard() {
    const data = await fetchJson("/api/manager/dashboard");
    setDashboard(data.dashboard ?? null);
  }

  async function loadRestaurantOverview() {
    const data = await fetchJson("/api/manager/restaurant");

    setOverview({
      restaurant: data.restaurant,
      tablesCount: data.tablesCount ?? 0,
      categoriesCount: data.categoriesCount ?? 0,
    });
  }

  async function loadTables() {
    const data = await fetchJson("/api/tables");
    setTables(data.tables ?? []);
  }

  async function loadPendingOrders() {
    const data = await fetchJson("/api/manager/orders");
    setPendingOrders(data.orders ?? []);
  }

  async function loadProducts() {
    const data = await fetchJson("/api/products");
    setProducts(data.products ?? []);
  }

  async function loadCategories() {
    const data = await fetchJson("/api/categories");
    setCategories(data.categories ?? []);
  }

  async function patchTable(
    tableId: string,
    action: TableAction,
    loadingSetter: (tableId: string | null) => void,
    successMessage: string,
  ) {
    try {
      loadingSetter(tableId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tableId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao atualizar mesa.");
      }

      setMessage(successMessage);
      await Promise.allSettled([loadTables(), loadDashboard(), loadPendingOrders()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar mesa.");
    } finally {
      loadingSetter(null);
    }
  }


  async function handleRegenerateTableQr(table: TableWithStatus) {
    if (table.active_session_id) {
      setMessage("Feche a mesa antes de gerar um novo QR Code.");
      return;
    }

    const confirmed = window.confirm(
      `Gerar um novo QR Code para ${table.name}? O QR antigo impresso para esta mesa deixará de funcionar.`,
    );

    if (!confirmed) return;

    try {
      setRegeneratingQrTableId(table.id);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tableId: table.id, action: "REGENERATE_QR" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao gerar novo QR Code.");
      }

      const updatedTable = data.table as TableWithStatus | undefined;

      if (updatedTable) {
        setTables((currentTables) =>
          currentTables.map((currentTable) =>
            currentTable.id === table.id ? { ...currentTable, ...updatedTable } : currentTable,
          ),
        );

        setQrModalTable((currentTable) =>
          currentTable?.id === table.id ? { ...currentTable, ...updatedTable } : currentTable,
        );
      }

      setMessage(`Novo QR Code gerado para ${table.name}.`);
      await Promise.allSettled([loadTables(), loadDashboard()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao gerar novo QR Code.");
    } finally {
      setRegeneratingQrTableId(null);
    }
  }

  async function handleRegenerateAllQrs() {
    const activeTables = tables.filter((table) => table.active_session_id);

    if (activeTables.length > 0) {
      setMessage("Feche todas as mesas ativas antes de gerar novos QR Codes para todas.");
      return;
    }

    const confirmed = window.confirm(
      "Gerar novos QR Codes para todas as mesas? Todos os QR Codes antigos impressos deixarão de funcionar.",
    );

    if (!confirmed) return;

    try {
      setRegeneratingAllQrs(true);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "REGENERATE_ALL_QR" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao gerar novos QR Codes.");
      }

      setTables(data.tables ?? []);
      setQrModalTable(null);
      setMessage(data.message ?? "Novos QR Codes gerados com sucesso.");
      await Promise.allSettled([loadTables(), loadDashboard()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao gerar novos QR Codes.");
    } finally {
      setRegeneratingAllQrs(false);
    }
  }

  async function handleApproveOrder(orderId: string) {
    try {
      setApprovingOrderId(orderId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/manager/orders", {
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
      setMessage("Pedido aprovado e enviado para produção.");
      await Promise.allSettled([loadDashboard(), loadTables()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao aprovar pedido.");
    } finally {
      setApprovingOrderId(null);
    }
  }

  function handleProductCreated(product: Product) {
    setProducts((currentProducts) => [product, ...currentProducts]);
    setMessage("Produto criado com sucesso.");
  }

  function handleProductUpdated(product: Product) {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id ? product : currentProduct,
      ),
    );
    setMessage("Produto atualizado com sucesso.");
  }

  function handleCategoryCreated(category: Category) {
    setCategories((currentCategories) => [category, ...currentCategories]);
    setMessage("Categoria criada com sucesso.");
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-6 text-center text-sm text-zinc-300">
        Carregando painel do gerente...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-black text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-hidden bg-zinc-950">
        <header className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-zinc-950/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-400">
                Painel do gerente
              </p>
              <h1 className="mt-1 truncate text-2xl font-black leading-tight">
                {overview?.restaurant?.name ?? "Quitéria"}
              </h1>
              <p className="mt-1 truncate text-xs text-zinc-400">
                {activeTabLabel} • {userName}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="shrink-0 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-300 transition active:scale-95"
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
              <ManagerDashboard dashboard={dashboard} />

              <div className="grid grid-cols-2 gap-3">
                <SummaryCard label="Mesas" value={overview?.tablesCount ?? tables.length} />
                <SummaryCard label="Produtos" value={products.length} />
                <SummaryCard label="Categorias" value={overview?.categoriesCount ?? categories.length} />
                <SummaryCard label="Pedidos" value={pendingOrders.length} />
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold">Operação agora</h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      Ações principais em formato de app mobile.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300">
                    {formatCurrency(dashboard?.revenueToday ?? 0)}
                  </span>
                </div>

                <div className="mt-4 grid gap-2">
                  <QuickActionButton
                    label="Acompanhar mesas"
                    detail={`${tableCounters.pending} aguardando • ${tableCounters.open} em atendimento`}
                    onClick={() => setActiveTab("tables")}
                  />
                  <QuickActionButton
                    label="Aprovar pedidos"
                    detail={`${pendingOrders.length} pedido(s) aguardando aprovação`}
                    onClick={() => setActiveTab("orders")}
                  />
                  <QuickActionButton
                    label="Editar cardápio"
                    detail={`${products.length} produto(s) e ${categories.length} categoria(s)`}
                    onClick={() => setActiveTab("products")}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "tables" && (
            <div className="space-y-4">
              <SectionHeader
                title="Mesas"
                description="Controle de atendimento, fechamento e QR Codes imprimíveis."
                actionLabel={regeneratingAllQrs ? "Gerando..." : "Novos QR"}
                onAction={handleRegenerateAllQrs}
              />

              <button
                type="button"
                onClick={() => loadTables().catch(() => null)}
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-zinc-200"
              >
                Atualizar mesas
              </button>

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
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-white/10 bg-white/[0.04] text-zinc-300"
                      }`}
                    >
                      {filter.label} <span className="opacity-80">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {filteredTables.length === 0 ? (
                  <EmptyMobileState text="Nenhuma mesa encontrada nesse filtro." />
                ) : (
                  filteredTables.map((table) => (
                    <ManagerTableCard
                      key={table.id}
                      table={table}
                      approvingTableId={approvingTableId}
                      requestingBillTableId={requestingBillTableId}
                      closingTableId={closingTableId}
                      regeneratingQrTableId={regeneratingQrTableId}
                      onOpenQr={() => setQrModalTable(table)}
                      onRegenerateQr={() => handleRegenerateTableQr(table)}
                      onApprove={() =>
                        patchTable(
                          table.id,
                          "APPROVE_SESSION",
                          setApprovingTableId,
                          "Mesa aprovada com sucesso.",
                        )
                      }
                      onRequestBill={() =>
                        patchTable(
                          table.id,
                          "REQUEST_BILL",
                          setRequestingBillTableId,
                          "Solicitação de conta registrada.",
                        )
                      }
                      onClose={() =>
                        patchTable(
                          table.id,
                          "CLOSE_SESSION",
                          setClosingTableId,
                          "Mesa fechada com sucesso.",
                        )
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "orders" && (
            <div className="space-y-4">
              <SectionHeader
                title="Pedidos"
                description="Aprovação rápida antes de enviar para cozinha ou bar."
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

          {activeTab === "products" && (
            <div className="space-y-4">
              <SectionHeader
                title="Produtos"
                description="Cadastro e edição do cardápio em lista mobile."
              />
              <CreateProductForm
                categories={categories.filter((category) => category.is_active)}
                onCreated={handleProductCreated}
              />
              <ProductList
                products={products}
                categories={categories}
                onUpdated={handleProductUpdated}
              />
            </div>
          )}

          {activeTab === "categories" && (
            <div className="space-y-4">
              <SectionHeader
                title="Categorias"
                description="Organização simples do cardápio."
              />
              <CreateCategoryForm onCreated={handleCategoryCreated} />
              <CategoryList categories={categories} />
            </div>
          )}

          {activeTab === "settings" && (
            <div className="space-y-4">
              <SectionHeader
                title="Configurações"
                description="Regras completas ficam em página própria para não poluir a operação."
              />
              <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-4">
                <p className="text-sm leading-relaxed text-zinc-300">
                  Abra a tela completa apenas quando precisar editar identidade visual, aprovações e regras do restaurante.
                </p>
                <Link
                  href="/manager/settings"
                  className="mt-4 block rounded-2xl bg-cyan-500 px-4 py-3 text-center text-sm font-bold text-white transition active:scale-95"
                >
                  Abrir configurações
                </Link>
              </div>
            </div>
          )}
        </section>

        {qrModalTable && (
          <TableQrModal
            table={qrModalTable}
            onClose={() => setQrModalTable(null)}
            onRegenerateQr={handleRegenerateTableQr}
            isRegenerating={regeneratingQrTableId === qrModalTable.id}
          />
        )}

        <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-white/10 bg-zinc-950/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
          <div className="grid grid-cols-6 gap-1">
            {MANAGER_TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setActiveTab(tab.id)}
                  className={`min-w-0 rounded-2xl px-1 py-2 text-center text-[10px] font-semibold transition active:scale-95 ${
                    isActive
                      ? "bg-orange-500 text-white shadow-[0_0_18px_rgba(249,115,22,0.22)]"
                      : "text-zinc-400"
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
    <div className={`min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] ${compact ? "p-3" : "p-4"}`}>
      <p className="truncate text-xs text-zinc-400">{label}</p>
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
      className="w-full rounded-2xl border border-white/10 bg-zinc-900/70 p-4 text-left transition active:scale-[0.99]"
    >
      <span className="block text-sm font-bold text-white">{label}</span>
      <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
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
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black leading-tight">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">{description}</p>
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
    <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
      <p className="text-sm text-zinc-400">{text}</p>
    </div>
  );
}

function ManagerTableCard({
  table,
  approvingTableId,
  requestingBillTableId,
  closingTableId,
  onApprove,
  onRequestBill,
  onClose,
  regeneratingQrTableId,
  onOpenQr,
  onRegenerateQr,
}: {
  table: TableWithStatus;
  approvingTableId: string | null;
  requestingBillTableId: string | null;
  closingTableId: string | null;
  regeneratingQrTableId: string | null;
  onOpenQr: () => void;
  onRegenerateQr: () => void;
  onApprove: () => void;
  onRequestBill: () => void;
  onClose: () => void;
}) {
  const status = getStatusInfo(table.operational_status);

  return (
    <article className={`w-full overflow-hidden rounded-3xl border p-4 ${status.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black leading-tight">{table.name}</p>
          <p className={`mt-1 text-xs font-bold ${status.text}`}>{status.label}</p>
        </div>
        <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${status.dot}`} />
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-zinc-500">Status</span>
          <span className="font-semibold text-zinc-200">
            {table.is_active ? "Mesa ativa" : "Mesa inativa"}
          </span>
        </div>

        <div className="mt-2 flex items-start justify-between gap-3 text-xs">
          <span className="shrink-0 text-zinc-500">QR</span>
          <span className="min-w-0 break-all text-right text-zinc-400">
            {table.qr_token}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <TableQrActions
          table={table}
          onOpenQr={onOpenQr}
          onRegenerateQr={onRegenerateQr}
          isRegenerating={regeneratingQrTableId === table.id}
        />
      </div>

      <div className="mt-4 grid gap-2">
        {table.operational_status === "PENDING_APPROVAL" && (
          <Button
            type="button"
            disabled={approvingTableId === table.id}
            onClick={onApprove}
            className="min-h-12 w-full bg-yellow-300 text-sm font-black text-zinc-950 hover:bg-yellow-200"
          >
            {approvingTableId === table.id ? "Aprovando..." : "Aprovar mesa"}
          </Button>
        )}

        {table.operational_status === "OPEN" && (
          <Button
            type="button"
            disabled={requestingBillTableId === table.id}
            onClick={onRequestBill}
            className="min-h-12 w-full bg-red-500 text-sm font-black hover:bg-red-400"
          >
            {requestingBillTableId === table.id ? "Solicitando..." : "Solicitar conta"}
          </Button>
        )}

        {table.operational_status === "BILL_REQUESTED" && (
          <Button
            type="button"
            disabled={closingTableId === table.id}
            onClick={onClose}
            className="min-h-12 w-full bg-emerald-500 text-sm font-black text-zinc-950 hover:bg-emerald-400"
          >
            {closingTableId === table.id ? "Fechando..." : "Fechar mesa"}
          </Button>
        )}
      </div>
    </article>
  );
}
