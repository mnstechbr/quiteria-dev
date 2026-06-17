"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableWithStatus } from "@/types/table";

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

type CashierTableListProps = {
  tables: TableWithStatus[];
  bills: CashierBill[];
  closingSessionId: string | null;
  onCloseBill: (sessionId: string, paymentMethod: string) => void;
};

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
      className: "border-yellow-300/60 bg-yellow-300/10 text-yellow-200",
    };
  }

  if (status === "OPEN") {
    return {
      label: "Em atendimento",
      className: "border-sky-300/60 bg-sky-300/10 text-sky-200",
    };
  }

  if (status === "BILL_REQUESTED") {
    return {
      label: "Conta solicitada",
      className: "border-red-400/60 bg-red-400/10 text-red-200",
    };
  }

  return {
    label: "Disponível",
    className: "border-emerald-300/50 bg-emerald-300/10 text-emerald-200",
  };
}

export function CashierTableList({
  tables,
  bills,
  closingSessionId,
  onCloseBill,
}: CashierTableListProps) {
  const [paymentMethods, setPaymentMethods] = useState<Record<string, string>>(
    {},
  );

  const tableSummary = useMemo(() => {
    return tables.reduce(
      (summary, table) => {
        summary.total += 1;

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
      },
    );
  }, [tables]);

  function handlePaymentMethodChange(sessionId: string, paymentMethod: string) {
    setPaymentMethods((current) => ({
      ...current,
      [sessionId]: paymentMethod,
    }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Mapa das mesas</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Visualização somente leitura para o caixa acompanhar a operação.
          </p>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 p-4 text-sm text-emerald-200">
            Disponíveis: {tableSummary.available}
          </div>
          <div className="rounded-2xl border border-yellow-300/40 bg-yellow-300/10 p-4 text-sm text-yellow-200">
            Aguardando: {tableSummary.pending}
          </div>
          <div className="rounded-2xl border border-sky-300/40 bg-sky-300/10 p-4 text-sm text-sky-200">
            Em atendimento: {tableSummary.open}
          </div>
          <div className="rounded-2xl border border-red-400/40 bg-red-400/10 p-4 text-sm text-red-200">
            Contas: {tableSummary.bill}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {tables.map((table) => {
            const statusInfo = getStatusInfo(table.operational_status);

            return (
              <div
                key={table.id}
                className={`rounded-2xl border p-4 ${statusInfo.className}`}
              >
                <p className="font-semibold text-white">{table.name}</p>
                <p className="mt-2 text-xs font-medium">{statusInfo.label}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Contas solicitadas</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Mesas aguardando pagamento e fechamento pelo caixa.
          </p>
        </div>

        {bills.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
            <p className="text-sm text-zinc-400">
              Nenhuma conta solicitada no momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bills.map((bill) => {
              const selectedPaymentMethod = paymentMethods[bill.session_id] ?? "";
              const isClosing = closingSessionId === bill.session_id;

              return (
                <div
                  key={bill.session_id}
                  className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5"
                >
                  <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{bill.table_name}</h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {bill.orders.length} pedido(s) vinculados à mesa.
                      </p>
                    </div>

                    <Badge>{formatCurrency(bill.total_amount)}</Badge>
                  </div>

                  <div className="space-y-3">
                    {bill.orders.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-xl border border-white/10 bg-zinc-950/60 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-zinc-300">
                            Pedido
                          </p>
                          <p className="text-sm text-zinc-400">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start justify-between gap-3 text-sm"
                            >
                              <div>
                                <p className="text-zinc-200">
                                  {item.quantity}x {item.product_name}
                                </p>
                                {item.notes && (
                                  <p className="text-xs text-zinc-500">
                                    Obs: {item.notes}
                                  </p>
                                )}
                              </div>

                              <p className="text-zinc-300">
                                {formatCurrency(item.total_price)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
                    <select
                      value={selectedPaymentMethod}
                      onChange={(event) =>
                        handlePaymentMethodChange(
                          bill.session_id,
                          event.target.value,
                        )
                      }
                      className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
                    >
                      <option value="">Selecione a forma de pagamento</option>
                      <option value="PIX">PIX</option>
                      <option value="CARD">Cartão</option>
                      <option value="CASH">Dinheiro</option>
                    </select>

                    <Button
                      type="button"
                      disabled={!selectedPaymentMethod || isClosing}
                      onClick={() =>
                        onCloseBill(bill.session_id, selectedPaymentMethod)
                      }
                    >
                      {isClosing ? "Finalizando..." : "Finalizar pagamento"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
