"use client";

import { PendingOrder } from "@/types/order";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

type ReadyOrdersListProps = {
  orders: PendingOrder[];
  deliveringOrderId: string | null;
  onMarkDelivered: (orderId: string) => void;
};

export function ReadyOrdersList({
  orders,
  deliveringOrderId,
  onMarkDelivered,
}: ReadyOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
        <p className="text-sm text-zinc-400">
          Nenhum pedido pronto para entrega.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 p-4 shadow-[0_0_18px_rgba(110,231,183,0.10)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-200">
                {order.table_name}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Pedido pronto para entrega
              </p>
            </div>

            <p className="text-sm font-semibold text-white">
              {formatCurrency(order.total_amount)}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-zinc-950/60 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {item.quantity}x {item.product_name}
                  </p>

                  {item.notes && (
                    <p className="mt-1 text-xs text-zinc-400">
                      {item.notes}
                    </p>
                  )}
                </div>

                <span className="rounded-full border border-emerald-300/30 px-3 py-1 text-xs text-emerald-200">
                  Pronto
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={deliveringOrderId === order.id}
            onClick={() => onMarkDelivered(order.id)}
            className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deliveringOrderId === order.id
              ? "Marcando entrega..."
              : "Marcar como entregue"}
          </button>
        </div>
      ))}
    </div>
  );
}
