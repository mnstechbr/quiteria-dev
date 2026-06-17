"use client";

import { useEffect, useState } from "react";
import { BarOrdersList } from "@/components/bar/BarOrdersList";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { ProductionOrder } from "@/types/order";

export default function BarPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando bar...
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
            <p className="text-sm font-medium text-orange-400">
              Quitéria
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Bar
            </h1>

            <p className="mt-3 text-zinc-400">
              Bebidas e drinks aprovados para preparo.
            </p>
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
          <Card>
            <p className="text-sm text-zinc-300">{message}</p>
          </Card>
        )}

        <BarOrdersList
          orders={orders}
          loadingItemId={loadingItemId}
          onStartItem={(itemId) => updateItem(itemId, "START_ITEM")}
          onMarkReady={(itemId) => updateItem(itemId, "MARK_READY")}
        />
      </section>
    </main>
  );
}
