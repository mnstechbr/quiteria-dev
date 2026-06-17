import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ACTIVE_SESSION_STATUSES = [
  "PENDING_APPROVAL",
  "OPEN",
  "BILL_REQUESTED",
];

type OrderRequestItem = {
  productId?: string;
  quantity?: number;
};

function normalizeItems(items: unknown): OrderRequestItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    productId:
      typeof item?.productId === "string"
        ? item.productId.trim()
        : undefined,
    quantity: Number(item?.quantity ?? 0),
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const sessionId = String(body.sessionId ?? "").trim();
    const items = normalizeItems(body.items);

    if (!sessionId) {
      throw new Error("Sessão da mesa não encontrada.");
    }

    if (items.length === 0) {
      throw new Error("Adicione pelo menos um produto ao pedido.");
    }

    const validItems = items.filter(
      (item) =>
        item.productId &&
        Number.isInteger(item.quantity) &&
        Number(item.quantity) > 0,
    );

    if (validItems.length !== items.length) {
      throw new Error("Existem itens inválidos no pedido.");
    }

    const { data: tableSession, error: sessionError } = await supabaseAdmin
      .from("table_sessions")
      .select("id, restaurant_id, table_id, status")
      .eq("id", sessionId)
      .in("status", ACTIVE_SESSION_STATUSES)
      .maybeSingle();

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!tableSession) {
      throw new Error("Sessão da mesa inválida ou encerrada.");
    }

    if (tableSession.status === "BILL_REQUESTED") {
      throw new Error("A conta já foi solicitada para esta mesa.");
    }

    const productIds = validItems.map((item) => item.productId as string);

    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select(
        "id, restaurant_id, name, price, preparation_area, is_active",
      )
      .eq("restaurant_id", tableSession.restaurant_id)
      .in("id", productIds)
      .eq("is_active", true);

    if (productsError) {
      throw new Error(productsError.message);
    }

    if (!products || products.length !== productIds.length) {
      throw new Error("Um ou mais produtos não estão disponíveis.");
    }

    const orderItems = validItems.map((item) => {
      const product = products.find(
        (currentProduct) => currentProduct.id === item.productId,
      );

      if (!product) {
        throw new Error("Produto inválido no pedido.");
      }

      const quantity = Number(item.quantity);
      const unitPrice = Number(product.price);
      const totalPrice = unitPrice * quantity;

      return {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        notes: null,
        status: "WAITING_APPROVAL",
        preparation_area: product.preparation_area,
      };
    });

    const totalAmount = orderItems.reduce(
      (total, item) => total + item.total_price,
      0,
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        restaurant_id: tableSession.restaurant_id,
        table_session_id: tableSession.id,
        status: "WAITING_APPROVAL",
        total_amount: totalAmount,
      })
      .select("id, restaurant_id, table_session_id, status, total_amount, created_at")
      .single();

    if (orderError) {
      throw new Error(orderError.message);
    }

    const itemsToInsert = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .insert(itemsToInsert);

    if (orderItemsError) {
      throw new Error(orderItemsError.message);
    }

    return NextResponse.json(
      {
        order,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao enviar pedido.",
      },
      { status: 400 },
    );
  }
}
