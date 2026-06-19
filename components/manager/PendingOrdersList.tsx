"use client";

import { Button } from "@/components/ui/Button";
import { PendingOrder } from "@/types/order";

type PendingOrdersListProps = {
  orders: PendingOrder[];
  approvingOrderId: string | null;
  onApproveOrder: (orderId: string) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

export function PendingOrdersList({
  orders,
  approvingOrderId,
  onApproveOrder,
}: PendingOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[color:var(--q-border)] bg-[rgba(13,21,18,0.74)] p-6 text-center sm:p-8">
        <p className="text-sm text-[var(--q-muted)]">
          Nenhum pedido aguardando aprovação no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {orders.map((order) => (
        <article
          key={order.id}
          className="w-full overflow-hidden rounded-3xl border border-yellow-300/40 bg-yellow-300/10 p-4 shadow-[0_0_18px_rgba(253,224,71,0.10)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-black text-yellow-200">
                {order.table_name}
              </p>

              <p className="mt-1 text-xs text-[var(--q-muted)]">
                Pedido aguardando aprovação
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-white sm:text-base">
                {formatCurrency(order.total_amount)}
              </p>

              <p className="mt-1 text-xs text-[var(--q-dim)]">
                {order.items.length} item(ns)
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(8,13,11,0.60)] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-white">
                    {item.quantity}x {item.product_name}
                  </p>

                  {item.notes && (
                    <p className="mt-1 break-words text-xs text-[var(--q-muted)]">
                      Obs: {item.notes}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-[var(--q-dim)]">
                    {item.preparation_area === "BAR" ? "Bar" : "Cozinha"}
                  </p>
                </div>

                <p className="shrink-0 text-right text-xs font-semibold text-[var(--q-text-soft)] sm:text-sm">
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
          </div>

          <Button
            type="button"
            disabled={approvingOrderId === order.id}
            onClick={() => onApproveOrder(order.id)}
            className="mt-4 min-h-12 w-full rounded-2xl text-sm font-black"
          >
            {approvingOrderId === order.id
              ? "Aprovando..."
              : "Aprovar pedido"}
          </Button>
        </article>
      ))}
    </div>
  );
}
