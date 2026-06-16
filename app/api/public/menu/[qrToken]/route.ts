import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const ACTIVE_SESSION_STATUSES = [
  "PENDING_APPROVAL",
  "OPEN",
  "BILL_REQUESTED",
];

async function getOrCreateTableSession({
  restaurantId,
  tableId,
}: {
  restaurantId: string;
  tableId: string;
}) {
  const { data: existingSession, error: existingSessionError } =
    await supabaseAdmin
      .from("table_sessions")
      .select(
        "id, restaurant_id, table_id, status, opened_by, opened_at, closed_at, total_amount, approved_by, approved_at, approval_requested_at",
      )
      .eq("restaurant_id", restaurantId)
      .eq("table_id", tableId)
      .in("status", ACTIVE_SESSION_STATUSES)
      .order("opened_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingSessionError) {
    throw new Error(existingSessionError.message);
  }

  if (existingSession) {
    return existingSession;
  }

  const { data: newSession, error: newSessionError } = await supabaseAdmin
    .from("table_sessions")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      status: "PENDING_APPROVAL",
      approval_requested_at: new Date().toISOString(),
    })
    .select(
      "id, restaurant_id, table_id, status, opened_by, opened_at, closed_at, total_amount, approved_by, approved_at, approval_requested_at",
    )
    .single();

  if (newSessionError) {
    throw new Error(newSessionError.message);
  }

  return newSession;
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{
      qrToken: string;
    }>;
  },
) {
  try {
    const { qrToken } = await context.params;

    const supabase = createSupabaseServerClient();

    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select(
        `
          id,
          name,
          restaurant_id,
          restaurants (
            id,
            name,
            slug,
            is_active
          )
        `,
      )
      .eq("qr_token", qrToken)
      .eq("is_active", true)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        {
          message: "Mesa não encontrada.",
        },
        { status: 404 },
      );
    }

    const session = await getOrCreateTableSession({
      restaurantId: table.restaurant_id,
      tableId: table.id,
    });

    const { data: categories, error: categoriesError } = await supabase
      .from("categories")
      .select(
        `
          id,
          name,
          sort_order,
          products (
            id,
            name,
            description,
            price,
            image_url,
            is_featured,
            preparation_area,
            is_active
          )
        `,
      )
      .eq("restaurant_id", table.restaurant_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    return NextResponse.json({
      table,
      session,
      categories: categories ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar cardápio.",
      },
      { status: 500 },
    );
  }
}