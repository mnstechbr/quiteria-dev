"use client";

import { TableWithStatus } from "@/types/table";

type TableGridProps = {
  tables: TableWithStatus[];
  approvingTableId: string | null;
  onApproveSession: (tableId: string) => void;
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
  approvingTableId,
  onApproveSession,
}: TableGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      {tables.map((table) => {
        const statusInfo = getTableStatusInfo(table.operational_status);
        const isPendingApproval =
          table.operational_status === "PENDING_APPROVAL";
        const isApproving = approvingTableId === table.id;

        return (
          <div
            key={table.id}
            className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${statusInfo.card}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{table.name}</p>

                <p className={`mt-2 text-xs font-medium ${statusInfo.text}`}>
                  {statusInfo.label}
                </p>
              </div>

              <span
                className={`mt-1 h-3 w-3 rounded-full ${statusInfo.dot}`}
              />
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              {table.is_active ? "Mesa ativa" : "Mesa inativa"}
            </p>

            <p className="mt-3 truncate text-xs text-zinc-600">
              QR: {table.qr_token}
            </p>

            {isPendingApproval && (
              <button
                type="button"
                disabled={isApproving}
                onClick={() => onApproveSession(table.id)}
                className="mt-4 w-full rounded-xl bg-yellow-300 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isApproving ? "Aprovando..." : "Aprovar mesa"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
