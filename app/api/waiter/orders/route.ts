import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireWaiter(request: Request) {
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
    .in("role", ["MANAGER", "WAITER"])
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    throw new Error("FORBIDDEN");
  }

  return {
    restaurantId: membership.restaurant_id,
  };
}

function normalizePendingOrders(orders: any[]) {
  return orders.map((order) => ({
    id: order.id,
    restaurant_id: order.restaurant_id,
    table_session_id: order.table_session_id,
    status: order.status,
    notes: order.notes,
    total_amount: Number(order.total_amount ?? 0),
    created_at: order.created_at,
    approved_at: order.approved_at,
    table_name:
      order.table_sessions?.tables?.name ??
      "Mesa não identificada",
    items: (order.order_items ?? []).map((item: any) => ({
      ...item,
      quantity: Number(item.quantity ?? 0),
      unit_price: Number(item.unit_price ?? 0),
      total_price: Number(item.total_price ?? 0),
    })),
  }));
}

async function openTableSessionFromApprovedOrder(orderId: string) {
  const { data: orderSession, error: orderSessionError } = await supabaseAdmin
    .from("orders")
    .select("table_session_id")
    .eq("id", orderId)
    .single();

  if (orderSessionError) {
    throw new Error(orderSessionError.message);
  }

  if (!orderSession?.table_session_id) {
    return;
  }

  const { error: sessionUpdateError } = await supabaseAdmin
    .from("table_sessions")
    .update({
      status: "OPEN",
      approved_at: new Date().toISOString(),
    })
    .eq("id", orderSession.table_session_id)
    .eq("status", "PENDING_APPROVAL");

  if (sessionUpdateError) {
    throw new Error(sessionUpdateError.message);
  }
}

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireWaiter(request);

    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        `
          id,
          restaurant_id,
          table_session_id,
          status,
          notes,
          total_amount,
          created_at,
          approved_at,
          table_sessions (
            id,
            table_id,
            tables (
              id,
              name
            )
          ),
          order_items (
            id,
            order_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            total_price,
            notes,
            status,
            preparation_area,
            created_at
          )
        `,
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "WAITING_APPROVAL")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      orders: normalizePendingOrders(data ?? []),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar pedidos.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { restaurantId } = await requireWaiter(request);
    const body = await request.json();

    const orderId = String(body.orderId ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!orderId) {
      throw new Error("Informe o pedido.");
    }

    if (action !== "APPROVE_ORDER") {
      throw new Error("Ação inválida.");
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, restaurant_id, status")
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .eq("status", "WAITING_APPROVAL")
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message);
    }

    if (!order) {
      throw new Error("Pedido aguardando aprovação não encontrado.");
    }

    const { data: updatedOrder, error: updateOrderError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "RECEIVED",
        approved_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("restaurant_id", restaurantId)
      .select("id, status, approved_at")
      .single();

    if (updateOrderError) {
      throw new Error(updateOrderError.message);
    }

    const { error: updateItemsError } = await supabaseAdmin
      .from("order_items")
      .update({
        status: "RECEIVED",
      })
      .eq("order_id", orderId);

    if (updateItemsError) {
      throw new Error(updateItemsError.message);
    }

    await openTableSessionFromApprovedOrder(orderId);

    return NextResponse.json({
      order: updatedOrder,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao aprovar pedido.",
      },
      { status: 400 },
    );
  }
}
