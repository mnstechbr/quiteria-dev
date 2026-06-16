import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireManager(request: Request) {
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
    .eq("role", "MANAGER")
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("FORBIDDEN");
  }

  return {
    supabase,
    restaurantId: membership.restaurant_id,
  };
}

function getOperationalStatus(sessionStatus?: string | null) {
  if (!sessionStatus) return "AVAILABLE";
  if (sessionStatus === "PENDING_APPROVAL") return "PENDING_APPROVAL";
  if (sessionStatus === "OPEN") return "OPEN";
  if (sessionStatus === "BILL_REQUESTED") return "BILL_REQUESTED";

  return "AVAILABLE";
}

function createQrToken() {
  return crypto.randomUUID();
}

export async function GET(request: Request) {
  try {
    const { supabase, restaurantId } = await requireManager(request);

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
      .in("status", ["PENDING_APPROVAL", "OPEN", "BILL_REQUESTED"]);

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
    const { supabase, restaurantId } = await requireManager(request);
    const body = await request.json();

    const tableId = String(body.tableId ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!tableId) {
      throw new Error("Informe a mesa.");
    }

    if (action !== "REGENERATE_QR") {
      throw new Error("Ação inválida.");
    }

    const { data: activeSession, error: sessionError } = await supabase
      .from("table_sessions")
      .select("id, status")
      .eq("restaurant_id", restaurantId)
      .eq("table_id", tableId)
      .in("status", ["PENDING_APPROVAL", "OPEN", "BILL_REQUESTED"])
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (activeSession) {
      throw new Error(
        "Não é possível gerar um novo QR enquanto a mesa possui uma sessão ativa.",
      );
    }

    const { data: updatedTable, error: updateError } = await supabase
      .from("tables")
      .update({
        qr_token: createQrToken(),
      })
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .select("id, restaurant_id, name, qr_token, is_active, created_at")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      table: {
        ...updatedTable,
        operational_status: "AVAILABLE",
        active_session_id: null,
      },
    });
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