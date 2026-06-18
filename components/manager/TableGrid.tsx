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
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-zinc-400">Nenhuma mesa encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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
          <article
            key={table.id}
            className={`w-full overflow-hidden rounded-3xl border p-4 transition active:scale-[0.99] ${statusInfo.card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="break-words text-xl font-black leading-tight">
                  {table.name}
                </p>

                <p
                  className={`mt-1 text-sm font-bold leading-snug ${statusInfo.text}`}
                >
                  {statusInfo.label}
                </p>
              </div>

              <span
                className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusInfo.dot}`}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-zinc-500">Mesa</p>
                <p className="mt-1 font-bold text-zinc-200">
                  {table.is_active ? "Ativa" : "Inativa"}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-zinc-500">Sessão</p>
                <p className="mt-1 truncate font-bold text-zinc-200">
                  {table.active_session_id ? "Aberta" : "Sem sessão"}
                </p>
              </div>
            </div>

            <p className="mt-3 break-all rounded-2xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-zinc-500">
              QR: {table.qr_token}
            </p>

            <div className="mt-4 space-y-2">
              {isPendingApproval && onApproveSession && (
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={() => onApproveSession(table.id)}
                  className="min-h-12 w-full rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-zinc-950 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isApproving ? "Aprovando..." : "Aprovar mesa"}
                </button>
              )}

              {isOpen && onRequestBill && (
                <button
                  type="button"
                  disabled={isRequestingBill}
                  onClick={() => onRequestBill(table.id)}
                  className="min-h-12 w-full rounded-2xl bg-red-400 px-4 py-3 text-sm font-black text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRequestingBill ? "Solicitando..." : "Solicitar conta"}
                </button>
              )}

              {isBillRequested && onCloseSession && (
                <button
                  type="button"
                  disabled={isClosing}
                  onClick={() => onCloseSession(table.id)}
                  className="min-h-12 w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-black text-zinc-950 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isClosing ? "Fechando..." : "Fechar mesa"}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
