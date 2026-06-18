"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TableGrid } from "@/components/manager/TableGrid";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { TableWithStatus } from "@/types/table";

export default function ManagerTablesPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [approvingTableId, setApprovingTableId] = useState<string | null>(null);
  const [requestingBillTableId, setRequestingBillTableId] = useState<string | null>(null);
  const [closingTableId, setClosingTableId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

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
      setMessage(error instanceof Error ? error.message : "Erro ao atualizar mesa.");
    } finally {
      loadingSetter(null);
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando mesas...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-3 py-4 pb-24 text-white sm:p-8">
      <section className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/manager" className="text-xs font-medium text-orange-400 hover:text-orange-300">
              ← Voltar ao painel
            </Link>
            <h1 className="mt-2 text-3xl font-bold">Mesas</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Status operacional, aprovação, solicitação de conta e fechamento.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleLogout}
            className="w-full border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white sm:w-auto"
          >
            Sair
          </Button>
        </div>

        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">Mapa de mesas</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Visual compacto para celular e grade ampla no desktop.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => loadTables().catch(() => null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 sm:w-auto"
            >
              Atualizar
            </Button>
          </div>

          {message && <p className="mb-4 text-sm text-zinc-300">{message}</p>}

          <TableGrid
            tables={tables}
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
          />
        </Card>
      </section>
    </main>
  );
}
