import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PRODUCTION_ITEM_STATUSES = ["RECEIVED", "IN_PROGRESS", "READY"];
const AREA = "KITCHEN";
const ALLOWED_ROLES = ["MANAGER", "KITCHEN"];

async function requireOperationalAccess(request: Request) {
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
    .eq("is_active", true)
    .maybeSingle();

  if (
    membershipError ||
    !membership ||
    !ALLOWED_ROLES.includes(membership.role)
  ) {
    throw new Error("FORBIDDEN");
  }

  return {
    restaurantId: membership.restaurant_id,
  };
}

function normalizeOrders(orders: any[]) {
  return orders
    .map((order) => ({
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
      items: (order.order_items ?? [])
        .filter((item: any) => item.preparation_area === AREA)
        .map((item: any) => ({
          ...item,
          quantity: Number(item.quantity ?? 0),
          unit_price: Number(item.unit_price ?? 0),
          total_price: Number(item.total_price ?? 0),
        })),
    }))
    .filter((order) => order.items.length > 0);
}

async function updateOrderStatusIfEverythingIsReady(orderId: string) {
  const { data: items, error } = await supabaseAdmin
    .from("order_items")
    .select("status")
    .eq("order_id", orderId)
    .neq("status", "CANCELLED");

  if (error) {
    throw new Error(error.message);
  }

  const allReady =
    (items ?? []).length > 0 &&
    (items ?? []).every((item) => item.status === "READY");

  if (!allReady) {
    return;
  }

  const { error: updateOrderError } = await supabaseAdmin
    .from("orders")
    .update({
      status: "READY",
    })
    .eq("id", orderId);

  if (updateOrderError) {
    throw new Error(updateOrderError.message);
  }
}

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireOperationalAccess(request);

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
      .in("status", ["RECEIVED", "IN_PROGRESS", "READY"])
      .order("approved_at", { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      orders: normalizeOrders(data ?? []),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar pedidos da cozinha.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { restaurantId } = await requireOperationalAccess(request);
    const body = await request.json();

    const itemId = String(body.itemId ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!itemId) {
      throw new Error("Informe o item.");
    }

    const nextStatus =
      action === "START_ITEM"
        ? "IN_PROGRESS"
        : action === "MARK_READY"
          ? "READY"
          : null;

    if (!nextStatus) {
      throw new Error("Ação inválida.");
    }

    const { data: existingItem, error: existingItemError } = await supabaseAdmin
      .from("order_items")
      .select(
        `
          id,
          order_id,
          preparation_area,
          orders!inner (
            id,
            restaurant_id
          )
        `,
      )
      .eq("id", itemId)
      .eq("preparation_area", AREA)
      .eq("orders.restaurant_id", restaurantId)
      .maybeSingle();

    if (existingItemError) {
      throw new Error(existingItemError.message);
    }

    if (!existingItem) {
      throw new Error("Item não encontrado para esta operação.");
    }

    const { data: item, error: updateError } = await supabaseAdmin
      .from("order_items")
      .update({
        status: nextStatus,
      })
      .eq("id", itemId)
      .select(
        "id, order_id, product_id, product_name, quantity, unit_price, total_price, notes, status, preparation_area, created_at",
      )
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    const { error: orderUpdateError } = await supabaseAdmin
      .from("orders")
      .update({
        status: "IN_PROGRESS",
      })
      .eq("id", item.order_id)
      .eq("restaurant_id", restaurantId)
      .eq("status", "RECEIVED");

    if (orderUpdateError) {
      throw new Error(orderUpdateError.message);
    }

    await updateOrderStatusIfEverythingIsReady(item.order_id);

    return NextResponse.json({
      item,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar item da cozinha.",
      },
      { status: 400 },
    );
  }
}
