"use client";

import { useEffect, useState } from "react";
import { CreateRestaurantForm } from "@/components/master/CreateRestaurantForm";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { isSuperAdmin } from "@/lib/auth/profile-service";
import { supabase } from "@/lib/supabase/client";
import { Restaurant } from "@/types/restaurant";

export default function MasterPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

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
    setRestaurants((currentRestaurants) => [
      restaurant,
      ...currentRestaurants,
    ]);
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando painel...
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
            <p className="text-sm font-medium text-orange-400">Painel Master</p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-zinc-400">
              Bem-vindo, {userName}. Aqui você gerenciará todos os restaurantes da plataforma.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:border-orange-500 hover:text-white"
          >
            Sair
          </button>
        </div>

        <CreateRestaurantForm onCreated={handleRestaurantCreated} />

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Restaurantes</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Lista de clientes cadastrados no Quitéria.
            </p>
          </div>

          {restaurants.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
              <p className="text-sm text-zinc-400">
                Nenhum restaurante cadastrado ainda.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/70 p-4"
                >
                  <div>
                    <p className="font-medium">{restaurant.name}</p>
                    <p className="text-sm text-zinc-500">/{restaurant.slug}</p>
                  </div>

                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
                    {restaurant.setup_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}