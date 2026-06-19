"use client";

import type { ProductionOrder, ProductionOrderItem } from "@/types/order";

type BarOrdersListProps = {
  orders: ProductionOrder[];
  emptyMessage?: string;
  loadingItemId: string | null;
  onStartItem: (itemId: string) => void;
  onMarkReady: (itemId: string) => void;
};

function getStatusInfo(status: string) {
  if (status === "RECEIVED") {
    return {
      label: "Recebido",
      dot: "bg-yellow-300",
      card: "border-yellow-300/50 bg-yellow-300/10",
      text: "text-yellow-200",
    };
  }

  if (status === "IN_PROGRESS") {
    return {
      label: "Em preparo",
      dot: "bg-sky-300",
      card: "border-sky-300/50 bg-sky-300/10",
      text: "text-sky-200",
    };
  }

  if (status === "READY") {
    return {
      label: "Pronto",
      dot: "bg-emerald-300",
      card: "border-emerald-300/50 bg-emerald-300/10",
      text: "text-emerald-200",
    };
  }

  return {
    label: status,
    dot: "bg-zinc-400",
    card: "border-[color:var(--q-border)] bg-[rgba(17,28,24,0.72)]",
    text: "text-[var(--q-text-soft)]",
  };
}

function getOrderProgress(items: ProductionOrderItem[]) {
  const readyItems = items.filter((item) => item.status === "READY").length;

  return `${readyItems}/${items.length} pronto(s)`;
}

export function BarOrdersList({
  orders,
  emptyMessage = "Nenhum pedido em produção no momento.",
  loadingItemId,
  onStartItem,
  onMarkReady,
}: BarOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[color:var(--q-border)] bg-[rgba(13,21,18,0.74)] p-8 text-center">
        <p className="text-sm leading-relaxed text-[var(--q-muted)]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <article
          key={order.id}
          className="overflow-hidden rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)]"
        >
          <header className="border-b border-[color:var(--q-border)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                  {order.table_name}
                </p>

                <h2 className="mt-1 truncate text-xl font-black text-white">
                  Pedido #{order.id.slice(0, 8)}
                </h2>
              </div>

              <span className="shrink-0 rounded-full border border-[color:var(--q-border)] px-3 py-1 text-xs font-bold text-[var(--q-text-soft)]">
                {getOrderProgress(order.items)}
              </span>
            </div>
          </header>

          <div className="space-y-3 p-3">
            {order.items.map((item) => {
              const statusInfo = getStatusInfo(item.status);
              const isUpdating = loadingItemId === item.id;

              return (
                <section
                  key={item.id}
                  className={`rounded-3xl border p-4 ${statusInfo.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-lg font-black leading-tight text-white">
                        {item.quantity}x {item.product_name}
                      </p>

                      {item.notes && (
                        <p className="mt-2 break-words rounded-2xl border border-[color:var(--q-border)] bg-[rgba(8,13,11,0.42)] p-3 text-sm leading-relaxed text-[var(--q-text-soft)]">
                          Obs: {item.notes}
                        </p>
                      )}
                    </div>

                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusInfo.dot}`} />
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(8,13,11,0.42)] p-3">
                    <span className="text-xs font-semibold text-[var(--q-dim)]">
                      Status
                    </span>
                    <span className={`text-xs font-black ${statusInfo.text}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2">
                    {item.status === "RECEIVED" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onStartItem(item.id)}
                        className="min-h-12 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? "Atualizando..." : "Iniciar preparo"}
                      </button>
                    )}

                    {item.status !== "READY" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onMarkReady(item.id)}
                        className="min-h-12 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? "Atualizando..." : "Marcar pronto"}
                      </button>
                    )}

                    {item.status === "READY" && (
                      <div className="min-h-12 rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-center text-sm font-black text-emerald-100">
                        Item pronto
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
