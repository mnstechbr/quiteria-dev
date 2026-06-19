"use client";

import { useEffect, useState } from "react";
import {
  ManagerMobileShell,
  MobileMetricCard,
  MobileSectionCard,
} from "@/components/manager/ManagerMobileShell";
import { PendingOrdersList } from "@/components/manager/PendingOrdersList";
import { Button } from "@/components/ui/Button";
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
      setMessage(
        error instanceof Error ? error.message : "Erro ao aprovar pedido.",
      );
    } finally {
      setApprovingOrderId(null);
    }
  }

  async function handleRefresh() {
    try {
      setMessage(null);
      await loadPendingOrders();
      setMessage("Pedidos atualizados.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao atualizar pedidos.",
      );
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--q-bg)] px-6 text-center text-sm text-white">
        Carregando pedidos...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <ManagerMobileShell
      title="Pedidos"
      description="Aprove pedidos antes de enviar para cozinha ou bar."
      activeHref="/manager/orders"
      onLogout={handleLogout}
    >
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard label="Aguardando" value={orders.length} />
        <MobileMetricCard
          label="Itens"
          value={orders.reduce((total, order) => total + order.items.length, 0)}
        />
      </div>

      <MobileSectionCard
        title="Aguardando aprovação"
        description="Cards verticais para aprovação rápida no celular."
        action={
          <Button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-2 text-xs"
          >
            Atualizar
          </Button>
        }
      >
        {message && (
          <p className="mb-3 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-3 text-sm text-[var(--q-text-soft)]">
            {message}
          </p>
        )}

        <PendingOrdersList
          orders={orders}
          approvingOrderId={approvingOrderId}
          onApproveOrder={handleApproveOrder}
        />
      </MobileSectionCard>
    </ManagerMobileShell>
  );
}
