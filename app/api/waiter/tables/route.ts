import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVE_SESSION_STATUSES = [
  "PENDING_APPROVAL",
  "OPEN",
  "BILL_REQUESTED",
];

const ALLOWED_OPERATIONAL_ROLES = ["MANAGER", "WAITER"];

async function requireOperationalUser(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = createSupabaseServerClient(token);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id, role, is_active")
    .eq("user_id", user.id)
    .in("role", ALLOWED_OPERATIONAL_ROLES)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("FORBIDDEN");
  }

  return {
    supabase,
    userId: user.id,
    restaurantId: membership.restaurant_id,
    role: membership.role,
  };
}

function getOperationalStatus(sessionStatus?: string | null) {
  if (!sessionStatus) return "AVAILABLE";
  if (sessionStatus === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (sessionStatus === "OPEN") return "OPEN";
  if (sessionStatus === "BILL_REQUESTED") return "BILL_REQUESTED";

  return "AVAILABLE";
}

export async function GET(request: Request) {
  try {
    const { supabase, restaurantId } = await requireOperationalUser(request);

    const { data: tables, error: tablesError } = await supabase
      .from("tables")
      .select("id, restaurant_id, name, qr_token, is_active, created_at")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true });

    if (tablesError) {
      throw new Error(tablesError.message);
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from("table_sessions")
      .select("id, table_id, status")
      .eq("restaurant_id", restaurantId)
      .in("status", ACTIVE_SESSION_STATUSES);

    if (sessionsError) {
      throw new Error(sessionsError.message);
    }

    const tablesWithStatus = (tables ?? []).map((table) => {
      const activeSession = (sessions ?? []).find(
        (session) => session.table_id === table.id,
      );

      return {
        ...table,
        operational_status: getOperationalStatus(activeSession?.status),
        active_session_id: activeSession?.id ?? null,
      };
    });

    return NextResponse.json({
      tables: tablesWithStatus,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar mesas.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { supabase, restaurantId, userId } = await requireOperationalUser(request);
    const body = await request.json();

    const tableId = String(body.tableId ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!tableId) {
      throw new Error("Informe a mesa.");
    }

    if (action === "APPROVE_SESSION") {
      const { data: pendingSession, error: pendingSessionError } = await supabase
        .from("table_sessions")
        .select("id, table_id, status")
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .eq("status", "PENDING_APPROVAL")
        .maybeSingle();

      if (pendingSessionError) {
        throw new Error(pendingSessionError.message);
      }

      if (!pendingSession) {
        throw new Error("Nenhuma sessão aguardando aprovação foi encontrada.");
      }

      const { data: approvedSession, error: approveError } = await supabase
        .from("table_sessions")
        .update({
          status: "OPEN",
          approved_by: userId,
          approved_at: new Date().toISOString(),
        })
        .eq("id", pendingSession.id)
        .eq("restaurant_id", restaurantId)
        .select("id, table_id, status")
        .single();

      if (approveError) {
        throw new Error(approveError.message);
      }

      return NextResponse.json({
        table: {
          id: tableId,
          operational_status: "OPEN",
          active_session_id: approvedSession.id,
        },
      });
    }

    if (action === "REQUEST_BILL") {
      const { data: openSession, error: openSessionError } = await supabase
        .from("table_sessions")
        .select("id, table_id, status")
        .eq("restaurant_id", restaurantId)
        .eq("table_id", tableId)
        .eq("status", "OPEN")
        .maybeSingle();

      if (openSessionError) {
        throw new Error(openSessionError.message);
      }

      if (!openSession) {
        throw new Error("Nenhuma sessão em atendimento foi encontrada.");
      }

      const { data: updatedSession, error: updateError } = await supabase
        .from("table_sessions")
        .update({
          status: "BILL_REQUESTED",
        })
        .eq("id", openSession.id)
        .eq("restaurant_id", restaurantId)
        .select("id, table_id, status")
        .single();

      if (updateError) {
        throw new Error(updateError.message);
      }

      return NextResponse.json({
        table: {
          id: tableId,
          operational_status: "BILL_REQUESTED",
          active_session_id: updatedSession.id,
        },
      });
    }

    throw new Error("Ação inválida.");
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar mesa.",
      },
      { status: 400 },
    );
  }
}
