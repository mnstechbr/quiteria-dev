"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TableWithStatus } from "@/types/table";

type CashierTable = TableWithStatus & {
  active_session_total_amount?: number;
};

type CashierBillItem = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  preparation_area: string;
  status: string;
};

type CashierBillOrder = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string | null;
  items: CashierBillItem[];
};

export type CashierBill = {
  session_id: string;
  table_id: string;
  table_name: string;
  status: string;
  opened_at: string | null;
  total_amount: number;
  orders: CashierBillOrder[];
};

export type CashierSettings = {
  defaultServicePercent: number;
  allowCashierServicePercentEdit: boolean;
};

type CashierTableListProps = {
  tables: CashierTable[];
  bills: CashierBill[];
  settings: CashierSettings;
  closingSessionId: string | null;
  onCloseBill: (
    sessionId: string,
    paymentMethod: string,
    servicePercent: number,
  ) => void;
};

type TableFilter =
  | "ALL"
  | "BILL_REQUESTED"
  | "OPEN"
  | "PENDING_APPROVAL"
  | "AVAILABLE";

const tableFilters: Array<{ value: TableFilter; label: string }> = [
  { value: "ALL", label: "Todas" },
  { value: "BILL_REQUESTED", label: "Contas" },
  { value: "OPEN", label: "Atendimento" },
  { value: "PENDING_APPROVAL", label: "Aprovar" },
  { value: "AVAILABLE", label: "Livres" },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getStatusInfo(status: TableWithStatus["operational_status"]) {
  if (status === "PENDING_APPROVAL") {
    return {
      label: "Aguardando aprovação",
      shortLabel: "Aprovar",
      className: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
    };
  }

  if (status === "OPEN") {
    return {
      label: "Em atendimento",
      shortLabel: "Atendimento",
      className: "border-sky-300/40 bg-sky-300/10 text-sky-100",
    };
  }

  if (status === "BILL_REQUESTED") {
    return {
      label: "Conta solicitada",
      shortLabel: "Conta",
      className: "border-red-400/40 bg-red-400/10 text-red-100",
    };
  }

  return {
    label: "Disponível",
    shortLabel: "Livre",
    className: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
  };
}

function calculateServiceAmount(subtotal: number, percent: number) {
  if (!Number.isFinite(percent) || percent <= 0) {
    return 0;
  }

  return Number(((subtotal * percent) / 100).toFixed(2));
}

export function CashierTableList({
  tables,
  bills,
  settings,
  closingSessionId,
  onCloseBill,
}: CashierTableListProps) {
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>(
    {},
  );
  const [servicePercents, setServicePercents] = useState<Record<string, string>>(
    {},
  );
  const [tableFilter, setTableFilter] = useState<TableFilter>("ALL");

  const tableSummary = useMemo(() => {
    return tables.reduce(
      (summary, table) => {
        summary.total += 1;
        summary.totalConsumption += Number(table.active_session_total_amount ?? 0);

        if (table.operational_status === "AVAILABLE") summary.available += 1;
        if (table.operational_status === "PENDING_APPROVAL") summary.pending += 1;
        if (table.operational_status === "OPEN") summary.open += 1;
        if (table.operational_status === "BILL_REQUESTED") summary.bill += 1;

        return summary;
      },
      {
        total: 0,
        available: 0,
        pending: 0,
        open: 0,
        bill: 0,
        totalConsumption: 0,
      },
    );
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (tableFilter === "ALL") {
      return tables;
    }

    return tables.filter((table) => table.operational_status === tableFilter);
  }, [tableFilter, tables]);

  function handlePaymentMethodChange(sessionId: string, paymentMethod: string) {
    setPaymentMethods((current) => ({
      ...current,
      [sessionId]: paymentMethod,
    }));
  }

  function handleServicePercentChange(sessionId: string, value: string) {
    setServicePercents((current) => ({
      ...current,
      [sessionId]: value,
    }));
  }

  return (
    <div className="mt-5 space-y-5" id="cashier-overview">
      <section className="q-panel p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Resumo
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Operação atual</h2>
          </div>

          <Badge>{tableSummary.total} mesas</Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="q-metric q-metric-red p-4">
            <p className="truncate text-xs text-[var(--q-muted)]">Contas</p>
            <p className="q-stat-value-red mt-1 text-2xl font-black">
              {tableSummary.bill}
            </p>
          </div>

          <div className="q-metric q-metric-blue p-4">
            <p className="truncate text-xs text-[var(--q-muted)]">Atendimento</p>
            <p className="q-stat-value-blue mt-1 text-2xl font-black">
              {tableSummary.open}
            </p>
          </div>

          <div className="q-metric q-metric-yellow p-4">
            <p className="truncate text-xs text-[var(--q-muted)]">Aprovação</p>
            <p className="q-stat-value-yellow mt-1 text-2xl font-black">
              {tableSummary.pending}
            </p>
          </div>

          <div className="q-metric q-metric-green p-4">
            <p className="truncate text-xs text-[var(--q-muted)]">Livres</p>
            <p className="q-stat-value-green mt-1 text-2xl font-black">
              {tableSummary.available}
            </p>
          </div>
        </div>

        <div className="q-metric q-metric-orange mt-3 p-4">
          <p className="truncate text-xs text-[var(--q-muted)]">Consumo ativo</p>
          <p className="q-stat-value-orange mt-1 text-2xl font-black">
            {formatCurrency(tableSummary.totalConsumption)}
          </p>
        </div>
      </section>

      <section
        id="cashier-bills"
        className="q-panel scroll-mt-20 p-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Pagamentos
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Contas solicitadas</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--q-muted)]">
            Feche as mesas que já pediram a conta.
          </p>
        </div>

        {bills.length === 0 ? (
          <div className="q-panel-soft mt-4 border-dashed p-6 text-center">
            <p className="text-sm text-[var(--q-muted)]">
              Nenhuma conta solicitada no momento.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {bills.map((bill) => {
              const selectedPaymentMethod = paymentMethods[bill.session_id] ?? "";
              const defaultServicePercent = Number(
                settings.defaultServicePercent ?? 0,
              );
              const servicePercentValue =
                servicePercents[bill.session_id] ?? String(defaultServicePercent);
              const servicePercent = Number(servicePercentValue || 0);
              const serviceAmount = calculateServiceAmount(
                bill.total_amount,
                servicePercent,
              );
              const finalAmount = bill.total_amount + serviceAmount;
              const isClosing = closingSessionId === bill.session_id;

              return (
                <article
                  key={bill.session_id}
                  className="q-panel-soft rounded-3xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold text-white">
                        {bill.table_name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--q-muted)]">
                        {bill.orders.length} pedido(s) vinculados.
                      </p>
                    </div>

                    <Badge>{formatCurrency(finalAmount)}</Badge>
                  </div>

                  <div className="mt-4 space-y-3">
                    {bill.orders.map((order) => (
                      <div
                        key={order.id}
                        className="q-panel-soft rounded-2xl p-4"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--q-border)] pb-3">
                          <p className="text-sm font-semibold text-[var(--q-text)]">
                            Pedido
                          </p>
                          <p className="shrink-0 text-sm font-semibold text-[var(--q-text-soft)]">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>

                        <div className="mt-3 space-y-3">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-3 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="break-words text-[var(--q-text)]">
                                  {item.quantity}x {item.product_name}
                                </p>
                                {item.notes && (
                                  <p className="mt-1 break-words text-xs text-[var(--q-dim)]">
                                    Obs: {item.notes}
                                  </p>
                                )}
                              </div>

                              <p className="shrink-0 text-[var(--q-text-soft)]">
                                {formatCurrency(item.total_price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="q-panel-soft mt-4 rounded-2xl p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--q-muted)]">Subtotal</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(bill.total_amount)}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm text-[var(--q-muted)]">
                          Taxa de serviço (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={servicePercentValue}
                          disabled={!settings.allowCashierServicePercentEdit}
                          onChange={(event) =>
                            handleServicePercentChange(
                              bill.session_id,
                              event.target.value,
                            )
                          }
                          className="q-input mt-2 disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        {!settings.allowCashierServicePercentEdit && (
                          <p className="mt-2 text-xs leading-5 text-[var(--q-dim)]">
                            Taxa fixa definida nas configurações do restaurante.
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-[var(--q-muted)]">Taxa calculada</p>
                        <p className="text-lg font-semibold text-white">
                          {formatCurrency(serviceAmount)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[color:var(--q-border)] pt-4">
                      <p className="text-sm text-[var(--q-muted)]">Total final</p>
                      <p className="text-2xl font-bold text-emerald-300">
                        {formatCurrency(finalAmount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <select
                      value={selectedPaymentMethod}
                      onChange={(event) =>
                        handlePaymentMethodChange(
                          bill.session_id,
                          event.target.value,
                        )
                      }
                      className="q-input"
                    >
                      <option value="">Forma de pagamento</option>
                      <option value="PIX">PIX</option>
                      <option value="CARD">Cartão</option>
                      <option value="CASH">Dinheiro</option>
                    </select>

                    <Button
                      type="button"
                      disabled={!selectedPaymentMethod || isClosing}
                      onClick={() =>
                        onCloseBill(
                          bill.session_id,
                          selectedPaymentMethod,
                          servicePercent,
                        )
                      }
                      className="w-full rounded-2xl py-3 text-base"
                    >
                      {isClosing ? "Finalizando..." : "Finalizar pagamento"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="cashier-tables"
        className="q-panel scroll-mt-20 p-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
            Mesas
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">Mapa do caixa</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--q-muted)]">
            Visualização de consumo e status em tempo real.
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {tableFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTableFilter(filter.value)}
              className={`q-chip px-3 py-3 text-sm font-semibold ${
                tableFilter === filter.value ? "q-chip-active" : ""
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {filteredTables.length === 0 ? (
          <div className="q-panel-soft mt-4 border-dashed p-6 text-center">
            <p className="text-sm text-[var(--q-muted)]">
              Nenhuma mesa encontrada nesse filtro.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredTables.map((table) => {
              const statusInfo = getStatusInfo(table.operational_status);
              const consumption = Number(table.active_session_total_amount ?? 0);

              return (
                <article
                  key={table.id}
                  className="q-panel p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-lg font-bold text-white">
                        {table.name}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-[var(--q-muted)]">
                        {statusInfo.label}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusInfo.className}`}>
                      {statusInfo.shortLabel}
                    </span>
                  </div>

                  <div className="q-panel-soft mt-4 p-4">
                    <p className="text-xs opacity-80">Consumo atual</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {formatCurrency(consumption)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
