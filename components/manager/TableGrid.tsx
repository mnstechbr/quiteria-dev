"use client";

import { TableWithStatus } from "@/types/table";

type TableGridProps = {
  tables: TableWithStatus[];
  approvingTableId?: string | null;
  requestingBillTableId?: string | null;
  closingTableId?: string | null;
  onApproveSession?: (tableId: string) => void;
  onRequestBill?: (tableId: string) => void;
  onCloseSession?: (tableId: string) => void;
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
      label: "Solicitou conta",
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

export function TableGrid({
  tables,
  approvingTableId = null,
  requestingBillTableId = null,
  closingTableId = null,
  onApproveSession,
  onRequestBill,
  onCloseSession,
}: TableGridProps) {
  if (tables.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <p className="text-sm text-zinc-400">Nenhuma mesa cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tables.map((table) => {
        const statusInfo = getTableStatusInfo(table.operational_status);
        const isPendingApproval =
          table.operational_status === "PENDING_APPROVAL";
        const isOpen = table.operational_status === "OPEN";
        const isBillRequested = table.operational_status === "BILL_REQUESTED";

        const isApproving = approvingTableId === table.id;
        const isRequestingBill = requestingBillTableId === table.id;
        const isClosing = closingTableId === table.id;

        return (
          <div
            key={table.id}
            className={`min-w-0 rounded-2xl border p-3 transition sm:p-4 sm:hover:-translate-y-0.5 ${statusInfo.card}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">
                  {table.name}
                </p>

                <p
                  className={`mt-1 text-[11px] font-medium leading-snug sm:text-xs ${statusInfo.text}`}
                >
                  {statusInfo.label}
                </p>
              </div>

              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full sm:h-3 sm:w-3 ${statusInfo.dot}`}
              />
            </div>

            <p className="mt-3 text-[11px] text-zinc-500 sm:text-xs">
              {table.is_active ? "Mesa ativa" : "Mesa inativa"}
            </p>

            <p className="mt-2 truncate text-[10px] text-zinc-600 sm:text-xs">
              QR: {table.qr_token}
            </p>

            <div className="mt-3 space-y-2">
              {isPendingApproval && onApproveSession && (
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => onApproveSession(table.id)}
                  className="w-full rounded-xl bg-yellow-300 px-3 py-2 text-[11px] font-bold text-zinc-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                >
                  {isApproving ? "Aprovando..." : "Aprovar mesa"}
                </button>
              )}

              {isOpen && onRequestBill && (
                <button
                  type="button"
                  disabled={isRequestingBill}
                  onClick={() => onRequestBill(table.id)}
                  className="w-full rounded-xl bg-red-400 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-red-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                >
                  {isRequestingBill ? "Solicitando..." : "Solicitar conta"}
                </button>
              )}

              {isBillRequested && onCloseSession && (
                <button
                  type="button"
                  disabled={isClosing}
                  onClick={() => onCloseSession(table.id)}
                  className="w-full rounded-xl bg-emerald-400 px-3 py-2 text-[11px] font-bold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 sm:text-xs"
                >
                  {isClosing ? "Fechando..." : "Fechar mesa"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
