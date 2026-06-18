"use client";

import { TableWithStatus } from "@/types/table";

type WaiterTableGridProps = {
  tables: TableWithStatus[];
  approvingTableId: string | null;
  requestingBillTableId: string | null;
  onApproveSession: (tableId: string) => void;
  onRequestBill: (tableId: string) => void;
};

function getTableStatusInfo(status: TableWithStatus["operational_status"]) {
  if (status === "PENDING_APPROVAL") {
    return {
      label: "Aguardando aprovação",
      dot: "bg-yellow-300",
      card: "border-yellow-300/60 bg-yellow-300/10 shadow-[0_0_18px_rgba(253,224,71,0.12)]",
      text: "text-yellow-200",
    };
  }

  if (status === "OPEN") {
    return {
      label: "Em atendimento",
      dot: "bg-sky-300",
      card: "border-sky-300/60 bg-sky-300/10 shadow-[0_0_18px_rgba(125,211,252,0.12)]",
      text: "text-sky-200",
    };
  }

  if (status === "BILL_REQUESTED") {
    return {
      label: "Conta solicitada",
      dot: "bg-red-400",
      card: "border-red-400/60 bg-red-400/10 shadow-[0_0_18px_rgba(248,113,113,0.12)]",
      text: "text-red-200",
    };
  }

  return {
    label: "Disponível",
    dot: "bg-emerald-300",
    card: "border-emerald-300/50 bg-emerald-300/10 shadow-[0_0_18px_rgba(110,231,183,0.10)]",
    text: "text-emerald-200",
  };
}

export function WaiterTableGrid({
  tables,
  approvingTableId,
  requestingBillTableId,
  onApproveSession,
  onRequestBill,
}: WaiterTableGridProps) {
  return (
    <div className="space-y-3">
      {tables.map((table) => {
        const statusInfo = getTableStatusInfo(table.operational_status);

        const isPendingApproval = table.operational_status === "PENDING_APPROVAL";
        const isOpen = table.operational_status === "OPEN";
        const isApproving = approvingTableId === table.id;
        const isRequestingBill = requestingBillTableId === table.id;

        return (
          <article
            key={table.id}
            className={`w-full overflow-hidden rounded-3xl border p-4 ${statusInfo.card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-black leading-tight text-white">
                  {table.name}
                </p>

                <p className={`mt-1 text-xs font-bold ${statusInfo.text}`}>
                  {statusInfo.label}
                </p>
              </div>

              <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusInfo.dot}`} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-zinc-500">Status</span>
                <span className="font-semibold text-zinc-200">
                  {table.is_active ? "Mesa ativa" : "Mesa inativa"}
                </span>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {isPendingApproval && (
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => onApproveSession(table.id)}
                  className="min-h-12 w-full rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-zinc-950 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApproving ? "Aprovando..." : "Aprovar mesa"}
                </button>
              )}

              {isOpen && (
                <button
                  type="button"
                  disabled={isRequestingBill}
                  onClick={() => onRequestBill(table.id)}
                  className="min-h-12 w-full rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRequestingBill ? "Solicitando..." : "Solicitar conta"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
