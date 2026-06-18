"use client";

export type ManagerDashboardData = {
  revenueToday: number;
  openTables: number;
  billRequestedTables: number;
  pendingOrders: number;
  productionItems: number;
  readyItems: number;
  deliveredItems: number;
};

type ManagerDashboardProps = {
  dashboard: ManagerDashboardData | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const EMPTY_DASHBOARD: ManagerDashboardData = {
  revenueToday: 0,
  openTables: 0,
  billRequestedTables: 0,
  pendingOrders: 0,
  productionItems: 0,
  readyItems: 0,
  deliveredItems: 0,
};

export function ManagerDashboard({ dashboard }: ManagerDashboardProps) {
  const safeDashboard = dashboard ?? EMPTY_DASHBOARD;

  const cards = [
    {
      label: "Faturamento hoje",
      value: formatCurrency(safeDashboard.revenueToday),
      detail: "Mesas fechadas no dia",
      className:
        "border-emerald-300/50 bg-emerald-300/10 shadow-[0_0_18px_rgba(110,231,183,0.10)]",
      valueClassName: "text-emerald-200",
    },
    {
      label: "Mesas abertas",
      value: safeDashboard.openTables,
      detail: "Em atendimento",
      className:
        "border-sky-300/50 bg-sky-300/10 shadow-[0_0_18px_rgba(125,211,252,0.10)]",
      valueClassName: "text-sky-200",
    },
    {
      label: "Contas solicitadas",
      value: safeDashboard.billRequestedTables,
      detail: "Aguardando caixa",
      className:
        "border-red-400/50 bg-red-400/10 shadow-[0_0_18px_rgba(248,113,113,0.10)]",
      valueClassName: "text-red-200",
    },
    {
      label: "Pedidos pendentes",
      value: safeDashboard.pendingOrders,
      detail: "Aguardando aprovação",
      className:
        "border-orange-300/50 bg-orange-300/10 shadow-[0_0_18px_rgba(253,186,116,0.10)]",
      valueClassName: "text-orange-200",
    },
    {
      label: "Em produção",
      value: safeDashboard.productionItems,
      detail: "Cozinha ou bar",
      className:
        "border-amber-300/50 bg-amber-300/10 shadow-[0_0_18px_rgba(252,211,77,0.10)]",
      valueClassName: "text-amber-200",
    },
    {
      label: "Prontos",
      value: safeDashboard.readyItems,
      detail: "Para entrega",
      className:
        "border-violet-300/50 bg-violet-300/10 shadow-[0_0_18px_rgba(196,181,253,0.10)]",
      valueClassName: "text-violet-200",
    },
    {
      label: "Entregues",
      value: safeDashboard.deliveredItems,
      detail: "Finalizados pelo garçom",
      className:
        "border-zinc-300/30 bg-zinc-300/10 shadow-[0_0_18px_rgba(212,212,216,0.06)]",
      valueClassName: "text-zinc-200",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`min-w-0 rounded-2xl border p-3 sm:p-5 ${card.className}`}
        >
          <p className="text-xs leading-tight text-zinc-400 sm:text-sm">
            {card.label}
          </p>
          <p
            className={`mt-1 break-words text-xl font-bold leading-tight sm:mt-2 sm:text-3xl ${card.valueClassName}`}
          >
            {card.value}
          </p>
          <p className="mt-1 text-[11px] leading-tight text-zinc-500 sm:mt-2 sm:text-xs">
            {card.detail}
          </p>
        </div>
      ))}
    </div>
  );
}
