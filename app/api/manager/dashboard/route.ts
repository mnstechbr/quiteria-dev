import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OPEN_SESSION_STATUSES = ["OPEN", "IN_SERVICE"];
const BILL_REQUESTED_SESSION_STATUSES = ["BILL_REQUESTED"];
const ACTIVE_SESSION_STATUSES = [
  "PENDING_APPROVAL",
  ...OPEN_SESSION_STATUSES,
  ...BILL_REQUESTED_SESSION_STATUSES,
];

const PRODUCTION_ITEM_STATUSES = ["RECEIVED", "IN_PROGRESS"];

function errorStatus(error: unknown) {
  if (!(error instanceof Error)) return 400;
  if (error.message === "UNAUTHORIZED") return 401;
  if (error.message === "FORBIDDEN") return 403;
  return 400;
}

async function requireManager(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const authSupabase = createSupabaseServerClient(token);

  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser();

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
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
    restaurantId: membership.restaurant_id as string,
  };
}

function getSaoPauloDayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  const start = new Date(Date.UTC(year, month - 1, day, 3, 0, 0, 0));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function sumMoney(rows: Array<{ total_amount?: unknown }>) {
  return rows.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
}

function countItemStatuses(orders: any[]) {
  const counters = {
    productionItems: 0,
    readyItems: 0,
    deliveredItems: 0,
  };

  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const status = String(item.status ?? "");

      if (PRODUCTION_ITEM_STATUSES.includes(status)) {
        counters.productionItems += 1;
      }

      if (status === "READY") {
        counters.readyItems += 1;
      }

      if (status === "DELIVERED") {
        counters.deliveredItems += 1;
      }
    }
  }

  return counters;
}

async function countOrdersByStatus(restaurantId: string, status: string) {
  const { count, error } = await supabaseAdmin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", status);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const { startIso, endIso } = getSaoPauloDayRange();

    const [
      activeSessionsResult,
      closedSessionsResult,
      todayOrdersResult,
      ordersWithItemsResult,
      pendingOrders,
    ] = await Promise.all([
      supabaseAdmin
        .from("table_sessions")
        .select("id, status")
        .eq("restaurant_id", restaurantId)
        .in("status", ACTIVE_SESSION_STATUSES),
      supabaseAdmin
        .from("table_sessions")
        .select("id, total_amount, closed_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "CLOSED")
        .gte("closed_at", startIso)
        .lt("closed_at", endIso),
      supabaseAdmin
        .from("orders")
        .select("id, total_amount, created_at, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startIso)
        .lt("created_at", endIso),
      supabaseAdmin
        .from("orders")
        .select("id, status, order_items ( id, status )")
        .eq("restaurant_id", restaurantId)
        .not("status", "eq", "CANCELLED"),
      countOrdersByStatus(restaurantId, "WAITING_APPROVAL"),
    ]);

    if (activeSessionsResult.error) {
      throw new Error(activeSessionsResult.error.message);
    }

    if (closedSessionsResult.error) {
      throw new Error(closedSessionsResult.error.message);
    }

    if (todayOrdersResult.error) {
      throw new Error(todayOrdersResult.error.message);
    }

    if (ordersWithItemsResult.error) {
      throw new Error(ordersWithItemsResult.error.message);
    }

    const activeSessions = activeSessionsResult.data ?? [];
    const closedSessions = closedSessionsResult.data ?? [];
    const todayOrders = todayOrdersResult.data ?? [];
    const revenueFromClosedSessions = sumMoney(closedSessions);
    const revenueFromTodayOrders = sumMoney(todayOrders);
    const revenueToday =
      revenueFromClosedSessions > 0
        ? revenueFromClosedSessions
        : revenueFromTodayOrders;

    const openTables = activeSessions.filter((session) =>
      OPEN_SESSION_STATUSES.includes(String(session.status)),
    ).length;

    const billRequestedTables = activeSessions.filter((session) =>
      BILL_REQUESTED_SESSION_STATUSES.includes(String(session.status)),
    ).length;

    const closedTablesToday = closedSessions.length;
    const ordersToday = todayOrders.length;
    const averageTicketToday =
      closedTablesToday > 0
        ? revenueToday / closedTablesToday
        : ordersToday > 0
          ? revenueToday / ordersToday
          : 0;

    const { productionItems, readyItems, deliveredItems } = countItemStatuses(
      ordersWithItemsResult.data ?? [],
    );

    return NextResponse.json({
      dashboard: {
        revenueToday,
        ordersToday,
        closedTablesToday,
        averageTicketToday,
        openTables,
        billRequestedTables,
        pendingOrders,
        productionItems,
        readyItems,
        deliveredItems,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar dashboard.",
      },
      { status: errorStatus(error) },
    );
  }
}
