"use client";

import { PendingOrder } from "@/types/order";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
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
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-zinc-400">
          Nenhum pedido pronto para entrega.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <article
          key={order.id}
          className="w-full overflow-hidden rounded-3xl border border-emerald-300/40 bg-emerald-300/10 p-4 shadow-[0_0_18px_rgba(110,231,183,0.10)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-emerald-200">
                {order.table_name}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Pedido pronto para entrega
              </p>
            </div>

            <p className="shrink-0 text-right text-sm font-bold text-white">
              {formatCurrency(order.total_amount)}
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-white">
                    {item.quantity}x {item.product_name}
                  </p>

                  {item.notes && (
                    <p className="mt-1 break-words text-xs text-zinc-400">
                      Obs: {item.notes}
                    </p>
                  )}
                </div>

                <span className="shrink-0 rounded-full border border-emerald-300/30 px-3 py-1 text-xs text-emerald-200">
                  Pronto
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={deliveringOrderId === order.id}
            onClick={() => onMarkDelivered(order.id)}
            className="mt-4 min-h-12 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-zinc-950 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deliveringOrderId === order.id
              ? "Marcando entrega..."
              : "Marcar como entregue"}
          </button>
        </article>
      ))}
    </div>
  );
}
