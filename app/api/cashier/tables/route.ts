import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_CASHIER_ROLES = ["MANAGER", "CASHIER"];

const ACTIVE_SESSION_STATUSES = [
  "PENDING_APPROVAL",
  "OPEN",
  "BILL_REQUESTED",
];

const VALID_PAYMENT_METHODS = ["PIX", "CARD", "CASH"];

async function requireCashierAccess(request: Request) {
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
    .in("role", ALLOWED_CASHIER_ROLES)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("FORBIDDEN");
  }

  return {
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

function normalizeBill(session: any) {
  const orders = session.orders ?? [];

  const normalizedOrders = orders.map((order: any) => ({
    id: order.id,
    status: order.status,
    total_amount: Number(order.total_amount ?? 0),
    created_at: order.created_at,
    items: (order.order_items ?? []).map((item: any) => ({
      id: item.id,
      product_name: item.product_name,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      total_price: Number(item.total_price ?? 0),
      notes: item.notes,
      preparation_area: item.preparation_area,
      status: item.status,
    })),
  }));

  const totalAmount = normalizedOrders.reduce(
    (sum: number, order: any) => sum + Number(order.total_amount ?? 0),
    0,
  );

  return {
    session_id: session.id,
    table_id: session.table_id,
    status: session.status,
    opened_at: session.opened_at,
    approval_requested_at: session.approval_requested_at,
    total_amount: totalAmount,
    orders: normalizedOrders,
  };
}

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireCashierAccess(request);

    const { data: tables, error: tablesError } = await supabaseAdmin
      .from("tables")
      .select("id, restaurant_id, name, qr_token, is_active, created_at")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true });

    if (tablesError) {
      throw new Error(tablesError.message);
    }

    const { data: sessions, error: sessionsError } = await supabaseAdmin
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

    const { data: billSessions, error: billSessionsError } = await supabaseAdmin
      .from("table_sessions")
      .select(
        `
          id,
          table_id,
          status,
          opened_at,
          approval_requested_at,
          tables (
            id,
            name
          ),
          orders (
            id,
            status,
            total_amount,
            created_at,
            order_items (
              id,
              product_name,
              quantity,
              unit_price,
              total_price,
              notes,
              preparation_area,
              status
            )
          )
        `,
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "BILL_REQUESTED")
      .order("opened_at", { ascending: true });

    if (billSessionsError) {
      throw new Error(billSessionsError.message);
    }

    const bills = (billSessions ?? []).map((session: any) => ({
      ...normalizeBill(session),
      table_name: session.tables?.name ?? "Mesa não identificada",
    }));

    return NextResponse.json({
      tables: tablesWithStatus,
      bills,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar caixa.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { restaurantId, userId } = await requireCashierAccess(request);
    const body = await request.json();

    const sessionId = String(body.sessionId ?? "").trim();
    const paymentMethod = String(body.paymentMethod ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (action !== "CLOSE_BILL") {
      throw new Error("Ação inválida.");
    }

    if (!sessionId) {
      throw new Error("Informe a conta que será fechada.");
    }

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error("Selecione uma forma de pagamento válida.");
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("table_sessions")
      .select("id, restaurant_id, table_id, status")
      .eq("id", sessionId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "BILL_REQUESTED")
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!session) {
      throw new Error("Conta aguardando fechamento não encontrada.");
    }

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, total_amount")
      .eq("restaurant_id", restaurantId)
      .eq("table_session_id", sessionId)
      .neq("status", "CANCELLED");

    if (ordersError) {
      throw new Error(ordersError.message);
    }

    const totalAmount = (orders ?? []).reduce(
      (sum, order) => sum + Number(order.total_amount ?? 0),
      0,
    );

    const { data: closedSession, error: closeError } = await supabaseAdmin
      .from("table_sessions")
      .update({
        status: "CLOSED",
        closed_at: new Date().toISOString(),
        total_amount: totalAmount,
        payment_method: paymentMethod,
        paid_at: new Date().toISOString(),
        closed_by: userId,
      })
      .eq("id", sessionId)
      .eq("restaurant_id", restaurantId)
      .select("id, table_id, status, closed_at, total_amount")
      .single();

    if (closeError) {
      throw new Error(closeError.message);
    }

    await supabaseAdmin.from("audit_logs").insert({
      restaurant_id: restaurantId,
      user_id: userId,
      action: "CASHIER_CLOSE_BILL",
      entity: "table_sessions",
      entity_id: sessionId,
      metadata: {
        table_id: session.table_id,
        payment_method: paymentMethod,
        total_amount: totalAmount,
      },
    });

    return NextResponse.json({
      session: closedSession,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao fechar conta.",
      },
      { status: 400 },
    );
  }
}
