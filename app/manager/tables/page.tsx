"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ManagerMobileShell,
  MobileMetricCard,
  MobileSectionCard,
} from "@/components/manager/ManagerMobileShell";
import { TableGrid } from "@/components/manager/TableGrid";
import { TableQrModal } from "@/components/manager/TableQrTools";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { TableOperationalStatus, TableWithStatus } from "@/types/table";

type TableFilter = "ALL" | TableOperationalStatus;

const TABLE_FILTERS: Array<{ id: TableFilter; label: string }> = [
  { id: "ALL", label: "Todas" },
  { id: "PENDING_APPROVAL", label: "Aprovar" },
  { id: "OPEN", label: "Atendimento" },
  { id: "BILL_REQUESTED", label: "Conta" },
  { id: "AVAILABLE", label: "Livres" },
];

const TABLE_STATUS_ORDER: Record<TableOperationalStatus, number> = {
  BILL_REQUESTED: 0,
  PENDING_APPROVAL: 1,
  OPEN: 2,
  AVAILABLE: 3,
  CLOSED: 4,
};

export default function ManagerTablesPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [tableFilter, setTableFilter] = useState<TableFilter>("ALL");
  const [approvingTableId, setApprovingTableId] = useState<string | null>(null);
  const [requestingBillTableId, setRequestingBillTableId] = useState<string | null>(null);
  const [closingTableId, setClosingTableId] = useState<string | null>(null);
  const [regeneratingQrTableId, setRegeneratingQrTableId] = useState<string | null>(null);
  const [regeneratingAllQrs, setRegeneratingAllQrs] = useState(false);
  const [qrModalTable, setQrModalTable] = useState<TableWithStatus | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const tableCounters = useMemo(() => {
    return tables.reduce(
      (counters, table) => {
        if (table.operational_status === "AVAILABLE") counters.available += 1;
        if (table.operational_status === "PENDING_APPROVAL") counters.pending += 1;
        if (table.operational_status === "OPEN") counters.open += 1;
        if (table.operational_status === "BILL_REQUESTED") counters.bill += 1;
        return counters;
      },
      { available: 0, pending: 0, open: 0, bill: 0 },
    );
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables
      .filter((table) =>
        tableFilter === "ALL" ? true : table.operational_status === tableFilter,
      )
      .sort((firstTable, secondTable) => {
        const statusDiff =
          TABLE_STATUS_ORDER[firstTable.operational_status] -
          TABLE_STATUS_ORDER[secondTable.operational_status];

        if (statusDiff !== 0) return statusDiff;
        return firstTable.name.localeCompare(secondTable.name, "pt-BR");
      });
  }, [tableFilter, tables]);

  useEffect(() => {
    async function initializePage() {
      try {
        const session = await getCurrentSession();

        if (!session) {
          window.location.replace("/login");
          return;
        }

        if (session.profile?.global_role === "SUPER_ADMIN") {
          window.location.replace("/master");
          return;
        }

        if (session.restaurantMembership?.role !== "MANAGER") {
          window.location.replace("/login");
          return;
        }

        setAllowed(true);
        await loadTables();
      } catch {
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    initializePage();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada.");
    }

    return session.access_token;
  }

  async function loadTables() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/tables", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar mesas.");
    }

    const data = await response.json();
    setTables(data.tables ?? []);
  }

  async function updateTableStatus({
    tableId,
    action,
    loadingSetter,
    successMessage,
  }: {
    tableId: string;
    action: "APPROVE_SESSION" | "REQUEST_BILL" | "CLOSE_SESSION";
    loadingSetter: (tableId: string | null) => void;
    successMessage: string;
  }) {
    try {
      loadingSetter(tableId);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tableId,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao atualizar mesa.");
      }

      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                operational_status:
                  data.table?.operational_status ?? table.operational_status,
                active_session_id:
                  data.table?.active_session_id ?? table.active_session_id,
              }
            : table,
        ),
      );

      setMessage(successMessage);
      await loadTables().catch(() => null);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao atualizar mesa.",
      );
    } finally {
      loadingSetter(null);
    }
  }


  async function handleRegenerateTableQr(table: TableWithStatus) {
    if (table.active_session_id) {
      setMessage("Feche a mesa antes de gerar um novo QR Code.");
      return;
    }

    const confirmed = window.confirm(
      `Gerar um novo QR Code para ${table.name}? O QR antigo impresso para esta mesa deixará de funcionar.`,
    );

    if (!confirmed) return;

    try {
      setRegeneratingQrTableId(table.id);
      setMessage(null);

      const accessToken = await getAccessToken();
      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tableId: table.id,
          action: "REGENERATE_QR",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao gerar novo QR Code.");
      }

      const updatedTable = data.table as TableWithStatus | undefined;

      if (updatedTable) {
        setTables((currentTables) =>
          currentTables.map((currentTable) =>
            currentTable.id === table.id ? { ...currentTable, ...updatedTable } : currentTable,
          ),
        );

        setQrModalTable((currentTable) =>
          currentTable?.id === table.id ? { ...currentTable, ...updatedTable } : currentTable,
        );
      }

      setMessage(`Novo QR Code gerado para ${table.name}.`);
      await loadTables().catch(() => null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao gerar novo QR Code.");
    } finally {
      setRegeneratingQrTableId(null);
    }
  }

  async function handleRegenerateAllQrs() {
    const activeTables = tables.filter((table) => table.active_session_id);

    if (activeTables.length > 0) {
      setMessage("Feche todas as mesas ativas antes de gerar novos QR Codes para todas.");
      return;
    }

    const confirmed = window.confirm(
      "Gerar novos QR Codes para todas as mesas? Todos os QR Codes antigos impressos deixarão de funcionar.",
    );

    if (!confirmed) return;

    try {
      setRegeneratingAllQrs(true);
      setMessage(null);

      const accessToken = await getAccessToken();
      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: "REGENERATE_ALL_QR",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao gerar novos QR Codes.");
      }

      setTables(data.tables ?? []);
      setQrModalTable(null);
      setMessage(data.message ?? "Novos QR Codes gerados com sucesso.");
      await loadTables().catch(() => null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao gerar novos QR Codes.");
    } finally {
      setRegeneratingAllQrs(false);
    }
  }

  function getFilterCount(filter: TableFilter) {
    if (filter === "ALL") return tables.length;
    if (filter === "AVAILABLE") return tableCounters.available;
    if (filter === "PENDING_APPROVAL") return tableCounters.pending;
    if (filter === "OPEN") return tableCounters.open;
    if (filter === "BILL_REQUESTED") return tableCounters.bill;
    return 0;
  }

  async function handleRefresh() {
    try {
      setMessage(null);
      await loadTables();
      setMessage("Mesas atualizadas.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao atualizar mesas.",
      );
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--q-bg)] px-6 text-center text-sm text-white">
        Carregando mesas...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <ManagerMobileShell
      title="Mesas"
      description="Aprovação, atendimento, conta solicitada, fechamento e QR Codes."
      activeHref="/manager/tables"
      onLogout={handleLogout}
    >
      <div className="grid grid-cols-4 gap-2">
        <MobileMetricCard label="Livres" value={tableCounters.available} />
        <MobileMetricCard label="Aprovar" value={tableCounters.pending} />
        <MobileMetricCard label="Atend." value={tableCounters.open} />
        <MobileMetricCard label="Conta" value={tableCounters.bill} />
      </div>

      <MobileSectionCard
        title="Mapa de mesas"
        description="Filtre por situação e veja tudo de cima a baixo."
        action={
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              onClick={handleRegenerateAllQrs}
              disabled={regeneratingAllQrs}
              className="px-3 py-2 text-xs"
            >
              {regeneratingAllQrs ? "Gerando..." : "Novos QR"}
            </Button>

            <Button
              type="button"
              onClick={handleRefresh}
              className="px-3 py-2 text-xs"
            >
              Atualizar
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABLE_FILTERS.map((filter) => {
            const isActive = tableFilter === filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setTableFilter(filter.id)}
                className={`shrink-0 rounded-2xl border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                  isActive
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-[color:var(--q-border)] bg-[var(--q-card)] text-[var(--q-text-soft)]"
                }`}
              >
                {filter.label} <span className="opacity-80">{getFilterCount(filter.id)}</span>
              </button>
            );
          })}
        </div>

        {message && (
          <p className="mb-3 rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-3 text-sm text-[var(--q-text-soft)]">
            {message}
          </p>
        )}

        <TableGrid
          tables={filteredTables}
          approvingTableId={approvingTableId}
          requestingBillTableId={requestingBillTableId}
          closingTableId={closingTableId}
          onApproveSession={(tableId) =>
            updateTableStatus({
              tableId,
              action: "APPROVE_SESSION",
              loadingSetter: setApprovingTableId,
              successMessage: "Mesa aprovada com sucesso.",
            })
          }
          onRequestBill={(tableId) =>
            updateTableStatus({
              tableId,
              action: "REQUEST_BILL",
              loadingSetter: setRequestingBillTableId,
              successMessage: "Solicitação de conta registrada.",
            })
          }
          onCloseSession={(tableId) =>
            updateTableStatus({
              tableId,
              action: "CLOSE_SESSION",
              loadingSetter: setClosingTableId,
              successMessage: "Mesa fechada com sucesso.",
            })
          }
          regeneratingQrTableId={regeneratingQrTableId}
          onOpenQr={setQrModalTable}
          onRegenerateQr={handleRegenerateTableQr}
        />

        {qrModalTable && (
          <TableQrModal
            table={qrModalTable}
            onClose={() => setQrModalTable(null)}
            onRegenerateQr={handleRegenerateTableQr}
            isRegenerating={regeneratingQrTableId === qrModalTable.id}
          />
        )}
      </MobileSectionCard>
    </ManagerMobileShell>
  );
}
