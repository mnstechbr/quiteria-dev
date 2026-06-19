"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateManagerForm } from "@/components/master/CreateManagerForm";
import { CreateRestaurantForm } from "@/components/master/CreateRestaurantForm";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { isSuperAdmin } from "@/lib/auth/profile-service";
import { supabase } from "@/lib/supabase/client";
import { Restaurant } from "@/types/restaurant";

type MasterSection = "overview" | "new" | "restaurants";
type RestaurantFilter = "all" | "active" | "suspended" | "pending" | "no-manager" | "movement";

type RestaurantStats = {
  tables_total: number;
  active_tables: number;
  products_total: number;
  active_products: number;
  categories_total: number;
  active_categories: number;
  active_sessions: number;
  orders_today: number;
  orders_total: number;
  closed_accounts_today: number;
  revenue_today: number;
  revenue_total: number;
  average_ticket_today: number;
  last_order_at: string | null;
};

type MasterRestaurant = Restaurant & {
  stats: RestaurantStats;
};

type PlatformStats = {
  total_restaurants: number;
  active_restaurants: number;
  pending_restaurants: number;
  suspended_restaurants: number;
  with_manager: number;
  without_manager: number;
  tables_total: number;
  active_tables: number;
  products_total: number;
  active_products: number;
  categories_total: number;
  active_sessions: number;
  orders_today: number;
  orders_total: number;
  closed_accounts_today: number;
  revenue_today: number;
  revenue_total: number;
  restaurants_with_movement_today: number;
  average_ticket_today: number;
};

type MasterDashboard = {
  platform: PlatformStats;
  restaurants: MasterRestaurant[];
};

const MASTER_NAV_ITEMS: Array<{
  id: MasterSection;
  label: string;
}> = [
  { id: "overview", label: "Início" },
  { id: "new", label: "Novo" },
  { id: "restaurants", label: "Clientes" },
];

const RESTAURANT_FILTERS: Array<{
  id: RestaurantFilter;
  label: string;
}> = [
  { id: "all", label: "Todos" },
  { id: "active", label: "Ativos" },
  { id: "suspended", label: "Desativados" },
  { id: "pending", label: "Pendentes" },
  { id: "no-manager", label: "Sem gerente" },
  { id: "movement", label: "Com movimento" },
];

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const integerFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

function isOperationalActive(restaurant: Pick<Restaurant, "setup_status" | "is_active">) {
  return restaurant.is_active && restaurant.setup_status !== "SUSPENDED";
}

function hasPendingSetup(restaurant: Pick<Restaurant, "setup_status">) {
  return restaurant.setup_status === "PENDING";
}

function getStatusLabel(restaurant: Pick<Restaurant, "setup_status" | "is_active">) {
  if (!isOperationalActive(restaurant)) {
    return "Desativado";
  }

  if (hasPendingSetup(restaurant)) {
    return "Ativo · setup pendente";
  }

  return "Ativo";
}

function getStatusClass(restaurant: Pick<Restaurant, "setup_status" | "is_active">) {
  if (!isOperationalActive(restaurant)) {
    return "border-red-400/40 bg-red-400/10 text-red-200";
  }

  if (hasPendingSetup(restaurant)) {
    return "border-yellow-300/40 bg-yellow-300/10 text-yellow-200";
  }

  return "border-emerald-300/40 bg-emerald-300/10 text-emerald-200";
}

function formatMoney(value: number) {
  return moneyFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatInteger(value: number) {
  return integerFormatter.format(Number.isFinite(value) ? value : 0);
}

function formatDateTime(value: string | null) {
  if (!value) return "Sem pedidos";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isSuspended(restaurant: Pick<Restaurant, "setup_status" | "is_active">) {
  return !isOperationalActive(restaurant);
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "default" | "green" | "orange" | "yellow" | "red";
}) {
  const toneClass = {
    default: "border-white/10 bg-zinc-900/80 text-white",
    green: "border-emerald-300/30 bg-emerald-300/10 text-emerald-100",
    orange: "border-orange-300/30 bg-orange-300/10 text-orange-100",
    yellow: "border-yellow-300/30 bg-yellow-300/10 text-yellow-100",
    red: "border-red-300/30 bg-red-300/10 text-red-100",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-medium text-current/70">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold leading-tight text-current">
        {value}
      </p>
      {helper && <p className="mt-2 text-xs leading-5 text-current/60">{helper}</p>}
    </div>
  );
}

export default function MasterPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [activeSection, setActiveSection] = useState<MasterSection>("overview");
  const [restaurantFilter, setRestaurantFilter] = useState<RestaurantFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [userName, setUserName] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<MasterDashboard | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionRestaurantId, setActionRestaurantId] = useState<string | null>(null);

  const restaurants = dashboard?.restaurants ?? [];
  const platform = dashboard?.platform;

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return restaurants.filter((restaurant) => {
      const matchesSearch =
        !normalizedSearch ||
        restaurant.name.toLowerCase().includes(normalizedSearch) ||
        restaurant.slug.toLowerCase().includes(normalizedSearch) ||
        (restaurant.manager_email ?? "").toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      if (restaurantFilter === "active") {
        return isOperationalActive(restaurant);
      }

      if (restaurantFilter === "suspended") {
        return isSuspended(restaurant);
      }

      if (restaurantFilter === "pending") {
        return restaurant.setup_status === "PENDING";
      }

      if (restaurantFilter === "no-manager") {
        return !restaurant.manager_email;
      }

      if (restaurantFilter === "movement") {
        return restaurant.stats.orders_today > 0 || restaurant.stats.revenue_today > 0;
      }

      return true;
    });
  }, [restaurantFilter, restaurants, searchTerm]);

  useEffect(() => {
    async function initializePage() {
      try {
        const session = await getCurrentSession();

        if (!session || !isSuperAdmin(session.profile)) {
          window.location.replace("/login");
          return;
        }

        setUserName(session.profile?.full_name ?? session.user.email ?? "Usuário");
        setAllowed(true);

        await loadDashboard();
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
  }, [activeSection]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada. Faça login novamente.");
    }

    return session.access_token;
  }

  async function loadDashboard() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/master/dashboard", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message ?? "Erro ao carregar painel master.");
    }

    setDashboard({
      platform: data.platform,
      restaurants: data.restaurants ?? [],
    });
  }

  async function refreshDashboard() {
    try {
      setRefreshing(true);
      setMessage(null);
      await loadDashboard();
      setMessage("Painel atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar painel.");
    } finally {
      setRefreshing(false);
    }
  }

  function handleRestaurantCreated() {
    setActiveSection("restaurants");
    void refreshDashboard();
  }

  function handleManagerCreated() {
    void refreshDashboard();
  }

  async function handleRestaurantStatus(restaurant: MasterRestaurant, action: "ACTIVATE" | "SUSPEND") {
    const confirmationMessage =
      action === "ACTIVATE"
        ? `Ativar o restaurante ${restaurant.name} e liberar os acessos vinculados?`
        : `Desativar o restaurante ${restaurant.name}? Os usuários vinculados deixam de acessar o sistema.`;

    if (!window.confirm(confirmationMessage)) return;

    try {
      setActionRestaurantId(restaurant.id);
      setMessage(null);

      const accessToken = await getAccessToken();
      const response = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao atualizar restaurante.");
      }

      setMessage(data.message ?? "Restaurante atualizado com sucesso.");
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar restaurante.");
    } finally {
      setActionRestaurantId(null);
    }
  }

  async function handleRemoveRestaurant(restaurant: MasterRestaurant) {
    const hasHistory =
      restaurant.stats.orders_total > 0 ||
      restaurant.stats.revenue_total > 0 ||
      restaurant.stats.active_sessions > 0;

    const confirmationMessage = hasHistory
      ? `O restaurante ${restaurant.name} possui histórico. Ele será desativado para preservar relatórios e pedidos. Continuar?`
      : `Remover definitivamente o restaurante ${restaurant.name}? Esta ação apaga mesas, produtos, categorias e vínculos desse cliente.`;

    if (!window.confirm(confirmationMessage)) return;

    try {
      setActionRestaurantId(restaurant.id);
      setMessage(null);

      const accessToken = await getAccessToken();
      const response = await fetch(`/api/restaurants/${restaurant.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao remover restaurante.");
      }

      setMessage(data.message ?? "Restaurante atualizado com sucesso.");
      await loadDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao remover restaurante.");
    } finally {
      setActionRestaurantId(null);
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center overflow-x-hidden bg-zinc-950 px-4 text-center text-sm text-zinc-300">
        Carregando painel master...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-zinc-950 text-white">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-between gap-3 px-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-400">
              Master
            </p>
            <h1 className="truncate text-lg font-bold leading-tight text-white">
              Quitéria
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={refreshing}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500 hover:text-white disabled:opacity-60"
            >
              {refreshing ? "..." : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500 hover:bg-white/[0.06] hover:text-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        {message && (
          <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-zinc-300">
            {message}
          </div>
        )}

        {activeSection === "overview" && (
          <div id="master-overview" className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <p className="text-sm text-zinc-400">Bem-vindo, {userName}.</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Controle da plataforma
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Acompanhe clientes, movimento, faturamento, cadastros e acessos dos restaurantes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MetricCard
                label="Faturamento hoje"
                value={formatMoney(platform?.revenue_today ?? 0)}
                helper={`${formatInteger(platform?.closed_accounts_today ?? 0)} contas fechadas`}
                tone="green"
              />
              <MetricCard
                label="Pedidos hoje"
                value={formatInteger(platform?.orders_today ?? 0)}
                helper={`${formatInteger(platform?.restaurants_with_movement_today ?? 0)} clientes com movimento`}
                tone="orange"
              />
              <MetricCard
                label="Restaurantes"
                value={formatInteger(platform?.total_restaurants ?? 0)}
                helper={`${formatInteger(platform?.active_restaurants ?? 0)} ativos`}
              />
              <MetricCard
                label="Desativados"
                value={formatInteger(platform?.suspended_restaurants ?? 0)}
                helper={`${formatInteger(platform?.pending_restaurants ?? 0)} pendentes`}
                tone="red"
              />
              <MetricCard
                label="Mesas ativas"
                value={`${formatInteger(platform?.active_tables ?? 0)}/${formatInteger(platform?.tables_total ?? 0)}`}
                helper="em todos os clientes"
              />
              <MetricCard
                label="Produtos ativos"
                value={`${formatInteger(platform?.active_products ?? 0)}/${formatInteger(platform?.products_total ?? 0)}`}
                helper={`${formatInteger(platform?.categories_total ?? 0)} categorias`}
              />
              <MetricCard
                label="Sessões abertas"
                value={formatInteger(platform?.active_sessions ?? 0)}
                helper="mesas em uso agora"
                tone="yellow"
              />
              <MetricCard
                label="Ticket médio hoje"
                value={formatMoney(platform?.average_ticket_today ?? 0)}
                helper="baseado nas contas do dia"
                tone="green"
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                Receita geral
              </p>
              <p className="mt-2 text-3xl font-black text-white">
                {formatMoney(platform?.revenue_total ?? 0)}
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Soma das contas fechadas registradas na plataforma.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => setActiveSection("new")}
                className="w-full rounded-2xl bg-orange-500 px-4 py-4 text-sm font-bold text-white transition hover:bg-orange-400"
              >
                Cadastrar novo restaurante
              </button>

              <button
                type="button"
                onClick={() => setActiveSection("restaurants")}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-zinc-200 transition hover:border-orange-500 hover:text-white"
              >
                Controlar clientes
              </button>
            </div>
          </div>
        )}

        {activeSection === "new" && (
          <div id="master-new" className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
                Novo cliente
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Cadastrar restaurante
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Após criar o restaurante, ele recebe mesas, categorias e configurações padrão.
              </p>
            </div>

            <CreateRestaurantForm onCreated={handleRestaurantCreated} />
          </div>
        )}

        {activeSection === "restaurants" && (
          <div id="master-restaurants" className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-400">
                    Clientes
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-white">
                    Restaurantes
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                    Ative, desative, remova com segurança e acompanhe estatísticas por cliente.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                  {filteredRestaurants.length}/{restaurants.length}
                </span>
              </div>

              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, slug ou gerente"
                className="mt-4 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-4 text-base text-white outline-none placeholder:text-zinc-600 focus:border-orange-500"
              />

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {RESTAURANT_FILTERS.map((filter) => {
                  const active = restaurantFilter === filter.id;

                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setRestaurantFilter(filter.id)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-white/10 bg-zinc-950 text-zinc-300"
                      }`}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredRestaurants.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-sm text-zinc-400">
                  Nenhum restaurante encontrado para esse filtro.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setRestaurantFilter("all");
                  }}
                  className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  Limpar filtros
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRestaurants.map((restaurant) => {
                  const isActionLoading = actionRestaurantId === restaurant.id;
                  const suspended = isSuspended(restaurant);

                  return (
                    <article
                      key={restaurant.id}
                      className="rounded-3xl border border-white/10 bg-zinc-900/80 p-4 shadow-xl shadow-black/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="break-words text-lg font-bold text-white">
                            {restaurant.name}
                          </h3>
                          <p className="mt-1 break-all text-sm text-zinc-500">
                            /{restaurant.slug}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold ${getStatusClass(
                            restaurant,
                          )}`}
                        >
                          {getStatusLabel(restaurant)}
                        </span>
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
                          Gerente
                        </p>
                        <p className="mt-2 break-all text-sm text-zinc-300">
                          {restaurant.manager_email ?? "Nenhum gerente cadastrado"}
                        </p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <MetricCard
                          label="Hoje"
                          value={formatMoney(restaurant.stats.revenue_today)}
                          helper={`${formatInteger(restaurant.stats.orders_today)} pedidos`}
                          tone="green"
                        />
                        <MetricCard
                          label="Total"
                          value={formatMoney(restaurant.stats.revenue_total)}
                          helper={`${formatInteger(restaurant.stats.orders_total)} pedidos`}
                        />
                        <MetricCard
                          label="Mesas"
                          value={`${formatInteger(restaurant.stats.active_tables)}/${formatInteger(restaurant.stats.tables_total)}`}
                          helper={`${formatInteger(restaurant.stats.active_sessions)} em uso`}
                          tone="yellow"
                        />
                        <MetricCard
                          label="Produtos"
                          value={`${formatInteger(restaurant.stats.active_products)}/${formatInteger(restaurant.stats.products_total)}`}
                          helper={`${formatInteger(restaurant.stats.active_categories)} categorias`}
                          tone="orange"
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-zinc-500">Contas hoje</p>
                            <p className="mt-1 font-semibold text-white">
                              {formatInteger(restaurant.stats.closed_accounts_today)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500">Ticket médio</p>
                            <p className="mt-1 font-semibold text-white">
                              {formatMoney(restaurant.stats.average_ticket_today)}
                            </p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-xs text-zinc-500">Último pedido</p>
                            <p className="mt-1 font-semibold text-white">
                              {formatDateTime(restaurant.stats.last_order_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {!restaurant.manager_email && (
                        <CreateManagerForm
                          restaurant={restaurant}
                          onManagerCreated={handleManagerCreated}
                        />
                      )}

                      <div className="mt-4 grid gap-2">
                        {suspended ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleRestaurantStatus(restaurant, "ACTIVATE")}
                            className="w-full rounded-2xl bg-emerald-500 px-4 py-4 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-60"
                          >
                            {isActionLoading ? "Atualizando..." : "Ativar cliente"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() => handleRestaurantStatus(restaurant, "SUSPEND")}
                            className="w-full rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-4 text-sm font-bold text-yellow-100 transition hover:border-yellow-300 disabled:opacity-60"
                          >
                            {isActionLoading ? "Atualizando..." : "Desativar cliente"}
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isActionLoading}
                          onClick={() => handleRemoveRestaurant(restaurant)}
                          className="w-full rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-4 text-sm font-bold text-red-100 transition hover:border-red-300 disabled:opacity-60"
                        >
                          {isActionLoading ? "Verificando..." : "Remover seguro"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2 text-center text-[11px] font-semibold text-zinc-300">
          {MASTER_NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={`rounded-2xl border px-2 py-3 transition ${
                  isActive
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-white/10 bg-white/[0.04] hover:border-orange-500 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
