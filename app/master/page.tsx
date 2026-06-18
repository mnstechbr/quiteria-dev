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

const MASTER_NAV_ITEMS: Array<{
  id: MasterSection;
  label: string;
}> = [
  { id: "overview", label: "Início" },
  { id: "new", label: "Novo" },
  { id: "restaurants", label: "Clientes" },
];

function getStatusLabel(status: Restaurant["setup_status"]) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "SUSPENDED") return "Suspenso";
  return "Pendente";
}

function getStatusClass(status: Restaurant["setup_status"]) {
  if (status === "ACTIVE") {
    return "border-emerald-300/40 bg-emerald-300/10 text-emerald-200";
  }

  if (status === "SUSPENDED") {
    return "border-red-400/40 bg-red-400/10 text-red-200";
  }

  return "border-yellow-300/40 bg-yellow-300/10 text-yellow-200";
}

export default function MasterPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [activeSection, setActiveSection] = useState<MasterSection>("overview");
  const [userName, setUserName] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const counters = useMemo(() => {
    return restaurants.reduce(
      (currentCounters, restaurant) => ({
        total: currentCounters.total + 1,
        active:
          currentCounters.active + (restaurant.setup_status === "ACTIVE" ? 1 : 0),
        pending:
          currentCounters.pending +
          (restaurant.setup_status === "PENDING" ? 1 : 0),
        withManager:
          currentCounters.withManager + (restaurant.manager_email ? 1 : 0),
      }),
      {
        total: 0,
        active: 0,
        pending: 0,
        withManager: 0,
      },
    );
  }, [restaurants]);

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

        await loadRestaurants();
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

  async function loadRestaurants() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada.");
    }

    const response = await fetch("/api/restaurants", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar restaurantes.");
    }

    const data = await response.json();
    setRestaurants(data.restaurants ?? []);
  }

  function handleRestaurantCreated(restaurant: Restaurant) {
    setRestaurants((currentRestaurants) => [restaurant, ...currentRestaurants]);
    setActiveSection("restaurants");
  }

  function handleManagerCreated(restaurantId: string, managerEmail: string) {
    setRestaurants((currentRestaurants) =>
      currentRestaurants.map((restaurant) =>
        restaurant.id === restaurantId
          ? {
              ...restaurant,
              manager_email: managerEmail,
            }
          : restaurant,
      ),
    );
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

          <button
            type="button"
            onClick={handleLogout}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-orange-500 hover:bg-white/[0.06] hover:text-white"
          >
            Sair
          </button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-md px-4 pb-28 pt-20">
        {activeSection === "overview" && (
          <div id="master-overview" className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <p className="text-sm text-zinc-400">Bem-vindo, {userName}.</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                Painel da plataforma
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Cadastre restaurantes, acompanhe clientes e crie o acesso inicial dos gerentes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
                <p className="text-xs font-medium text-zinc-500">Restaurantes</p>
                <p className="mt-2 text-2xl font-bold text-white">{counters.total}</p>
              </div>

              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/10 p-4">
                <p className="text-xs font-medium text-emerald-200/80">Ativos</p>
                <p className="mt-2 text-2xl font-bold text-emerald-100">{counters.active}</p>
              </div>

              <div className="rounded-2xl border border-yellow-300/30 bg-yellow-300/10 p-4">
                <p className="text-xs font-medium text-yellow-200/80">Pendentes</p>
                <p className="mt-2 text-2xl font-bold text-yellow-100">{counters.pending}</p>
              </div>

              <div className="rounded-2xl border border-orange-300/30 bg-orange-300/10 p-4">
                <p className="text-xs font-medium text-orange-200/80">Com gerente</p>
                <p className="mt-2 text-2xl font-bold text-orange-100">{counters.withManager}</p>
              </div>
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
                Ver restaurantes cadastrados
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
                Após criar o restaurante, ele já recebe as mesas e categorias padrão.
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
                    Lista de clientes cadastrados no Quitéria.
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                  {restaurants.length}
                </span>
              </div>
            </div>

            {restaurants.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-sm text-zinc-400">
                  Nenhum restaurante cadastrado ainda.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSection("new")}
                  className="mt-4 w-full rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  Criar primeiro restaurante
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {restaurants.map((restaurant) => (
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
                          restaurant.setup_status,
                        )}`}
                      >
                        {getStatusLabel(restaurant.setup_status)}
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

                    {!restaurant.manager_email && (
                      <CreateManagerForm
                        restaurant={restaurant}
                        onManagerCreated={handleManagerCreated}
                      />
                    )}
                  </article>
                ))}
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
