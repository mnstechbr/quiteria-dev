"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PendingOrdersList } from "@/components/manager/PendingOrdersList";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { PendingOrder } from "@/types/order";

export default function ManagerOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
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

        if (session.restaurantMembership?.role !== "MANAGER") {
          window.location.replace("/login");
          return;
        }

        setAllowed(true);
        await loadPendingOrders();
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

  async function loadPendingOrders() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/manager/orders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar pedidos pendentes.");
    }

    const data = await response.json();
    setOrders(data.orders ?? []);
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

      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.id !== orderId),
      );
      setMessage("Pedido aprovado e enviado para produção.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao aprovar pedido.");
    } finally {
      setApprovingOrderId(null);
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando pedidos...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-3 py-4 pb-24 text-white sm:p-8">
      <section className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/manager" className="text-xs font-medium text-orange-400 hover:text-orange-300">
              ← Voltar ao painel
            </Link>
            <h1 className="mt-2 text-3xl font-bold">Pedidos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Aprove pedidos antes de enviar para cozinha ou bar.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleLogout}
            className="w-full border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white sm:w-auto"
          >
            Sair
          </Button>
        </div>

        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">
                Aguardando aprovação
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Lista isolada para não poluir o painel principal no celular.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => loadPendingOrders().catch(() => null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 sm:w-auto"
            >
              Atualizar
            </Button>
          </div>

          {message && <p className="mb-4 text-sm text-zinc-300">{message}</p>}

          <PendingOrdersList
            orders={orders}
            approvingOrderId={approvingOrderId}
            onApproveOrder={handleApproveOrder}
          />
        </Card>
      </section>
    </main>
  );
}
