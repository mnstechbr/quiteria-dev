"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductionOrder } from "@/types/order";

type BarOrdersListProps = {
  orders: ProductionOrder[];
  loadingItemId: string | null;
  onStartItem: (itemId: string) => void;
  onMarkReady: (itemId: string) => void;
};

function getStatusLabel(status: string) {
  if (status === "RECEIVED") return "Recebido";
  if (status === "IN_PROGRESS") return "Em preparo";
  if (status === "READY") return "Pronto";

  return status;
}

export function BarOrdersList({
  orders,
  loadingItemId,
  onStartItem,
  onMarkReady,
}: BarOrdersListProps) {
  if (orders.length === 0) {
    return (
      <Card>
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <p className="text-sm text-zinc-400">
            Nenhum pedido em produção no momento.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id}>
          <div className="mb-4 flex flex-col justify-between gap-2 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium text-orange-400">
                {order.table_name}
              </p>

              <h2 className="mt-1 text-xl font-semibold">
                Pedido #{order.id.slice(0, 8)}
              </h2>
            </div>

            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-300">
              {getStatusLabel(order.status)}
            </span>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div>
                    <p className="font-semibold">
                      {item.quantity}x {item.product_name}
                    </p>

                    {item.notes && (
                      <p className="mt-1 text-sm text-zinc-400">
                        Obs: {item.notes}
                      </p>
                    )}

                    <p className="mt-2 text-xs text-zinc-500">
                      Status: {getStatusLabel(item.status)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.status === "RECEIVED" && (
                      <Button
                        type="button"
                        disabled={loadingItemId === item.id}
                        onClick={() => onStartItem(item.id)}
                      >
                        {loadingItemId === item.id
                          ? "Atualizando..."
                          : "Preparar"}
                      </Button>
                    )}

                    {item.status !== "READY" && (
                      <Button
                        type="button"
                        disabled={loadingItemId === item.id}
                        onClick={() => onMarkReady(item.id)}
                        className="bg-emerald-500 hover:bg-emerald-400"
                      >
                        {loadingItemId === item.id
                          ? "Atualizando..."
                          : "Marcar pronto"}
                      </Button>
                    )}

                    {item.status === "READY" && (
                      <span className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                        Pronto
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
