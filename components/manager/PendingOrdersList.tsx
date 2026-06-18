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
      <div className="rounded-2xl border border-dashed border-white/10 p-5 text-center sm:p-8">
        <p className="text-sm text-zinc-400">
          Nenhum pedido aguardando aprovação no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {orders.map((order) => (
        <div
          key={order.id}
          className="rounded-2xl border border-yellow-300/40 bg-yellow-300/10 p-3 sm:p-4 shadow-[0_0_18px_rgba(253,224,71,0.10)]"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-200">
                {order.table_name}
              </p>

              <p className="mt-1 text-xs text-zinc-400">
                Pedido aguardando aprovação
              </p>
            </div>

            <div className="text-left md:text-right">
              <p className="text-base font-semibold text-white sm:text-lg">
                {formatCurrency(order.total_amount)}
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                {order.items.length} item(ns)
              </p>
            </div>
          </div>

          <div className="mt-3 space-y-2 sm:mt-4">
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
                      Obs: {item.notes}
                    </p>
                  )}

                  <p className="mt-1 text-xs text-zinc-500">
                    {item.preparation_area === "BAR" ? "Bar" : "Cozinha"}
                  </p>
                </div>

                <p className="text-sm text-zinc-300">
                  {formatCurrency(item.total_price)}
                </p>
              </div>
            ))}
          </div>

          <Button
            type="button"
            disabled={approvingOrderId === order.id}
            onClick={() => onApproveOrder(order.id)}
            className="mt-4"
          >
            {approvingOrderId === order.id
              ? "Aprovando..."
              : "Aprovar pedido"}
          </Button>
        </div>
      ))}
    </div>
  );
}
