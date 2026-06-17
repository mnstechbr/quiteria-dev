import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
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
    restaurantId: membership.restaurant_id,
  };
}

async function countRows({
  table,
  restaurantId,
  status,
}: {
  table: "table_sessions" | "order_items" | "orders";
  restaurantId: string;
  status: string;
}) {
  const { count, error } = await supabaseAdmin
    .from(table)
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: closedSessions, error: revenueError } = await supabaseAdmin
      .from("table_sessions")
      .select("final_amount")
      .eq("restaurant_id", restaurantId)
      .gte("closed_at", todayStart.toISOString());

    if (revenueError) {
      throw new Error(revenueError.message);
    }

    const revenueToday = (closedSessions ?? []).reduce(
      (sum, session) => sum + Number(session.final_amount ?? 0),
      0,
    );

    const [
      openTables,
      billRequestedTables,
      pendingOrders,
      productionItems,
      readyItems,
      deliveredItems,
    ] = await Promise.all([
      countRows({
        table: "table_sessions",
        restaurantId,
        status: "OPEN",
      }),
      countRows({
        table: "table_sessions",
        restaurantId,
        status: "BILL_REQUESTED",
      }),
      countRows({
        table: "orders",
        restaurantId,
        status: "WAITING_APPROVAL",
      }),
      countRows({
        table: "order_items",
        restaurantId,
        status: "RECEIVED",
      }),
      countRows({
        table: "order_items",
        restaurantId,
        status: "READY",
      }),
      countRows({
        table: "order_items",
        restaurantId,
        status: "DELIVERED",
      }),
    ]);

    return NextResponse.json({
      dashboard: {
        revenueToday,
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
      { status: 401 },
    );
  }
}
