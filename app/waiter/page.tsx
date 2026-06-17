"use client";

import { useEffect, useState } from "react";
import { PendingOrdersList } from "@/components/manager/PendingOrdersList";
import { ReadyOrdersList } from "@/components/waiter/ReadyOrdersList";
import { WaiterTableGrid } from "@/components/waiter/WaiterTableGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { PendingOrder } from "@/types/order";
import { TableWithStatus } from "@/types/table";

const ALLOWED_WAITER_ROLES = ["MANAGER", "WAITER"];

export default function WaiterPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState("");
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [readyOrders, setReadyOrders] = useState<PendingOrder[]>([]);

  const [approvingTableId, setApprovingTableId] = useState<string | null>(null);
  const [requestingBillTableId, setRequestingBillTableId] = useState<string | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState<string | null>(null);
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const [deliveryMessage, setDeliveryMessage] = useState<string | null>(null);

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

        await Promise.all([
          loadTables(),
          loadPendingOrders(),
          loadReadyOrders(),
        ]);
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

  async function loadTables() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/waiter/tables", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar mesas.");
    }

    const data = await response.json();
    setTables(data.tables ?? []);
  }

  async function loadPendingOrders() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/waiter/orders", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar pedidos pendentes.");
    }

    const data = await response.json();
    setPendingOrders(data.orders ?? []);
  }

  async function loadReadyOrders() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/waiter/orders?view=READY_FOR_DELIVERY", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar pedidos prontos para entrega.");
    }

    const data = await response.json();
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
      setTableMessage(null);

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

      setTableMessage(successMessage);
    } catch (error) {
      setTableMessage(
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
      setOrderMessage(null);

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

      await Promise.all([
        loadTables(),
        loadReadyOrders(),
      ]);

      setOrderMessage("Pedido aprovado e enviado para produção.");
    } catch (error) {
      setOrderMessage(
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
      setDeliveryMessage(null);

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

      setDeliveryMessage("Pedido marcado como entregue.");
    } catch (error) {
      setDeliveryMessage(
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
            <p className="text-sm font-medium text-orange-400">
              Painel do Garçom
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-zinc-400">
              Bem-vindo, {userName}.
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

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Pedidos aguardando aprovação</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Aprove os pedidos dos clientes antes de enviar para produção.
            </p>

            {orderMessage && (
              <p className="mt-3 text-sm text-zinc-300">
                {orderMessage}
              </p>
            )}
          </div>

          <PendingOrdersList
            orders={pendingOrders}
            approvingOrderId={approvingOrderId}
            onApproveOrder={handleApproveOrder}
          />
        </Card>

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Pedidos prontos para entrega</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Marque como entregue quando levar o pedido para a mesa.
            </p>

            {deliveryMessage && (
              <p className="mt-3 text-sm text-zinc-300">
                {deliveryMessage}
              </p>
            )}
          </div>

          <ReadyOrdersList
            orders={readyOrders}
            deliveringOrderId={deliveringOrderId}
            onMarkDelivered={handleMarkDelivered}
          />
        </Card>

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Mesas</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Acompanhe mesas aguardando aprovação, em atendimento e solicitando conta.
            </p>

            {tableMessage && (
              <p className="mt-3 text-sm text-zinc-300">
                {tableMessage}
              </p>
            )}
          </div>

          <WaiterTableGrid
            tables={tables}
            approvingTableId={approvingTableId}
            requestingBillTableId={requestingBillTableId}
            onApproveSession={handleApproveTableSession}
            onRequestBill={handleRequestBill}
          />
        </Card>
      </section>
    </main>
  );
}
