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

export async function GET(request: Request) {
  try {
    const { supabase, restaurantId } = await requireManager(request);

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name, slug, is_active, setup_status, manager_email, created_at, updated_at")
      .eq("id", restaurantId)
      .single();

    if (restaurantError) {
      throw new Error(restaurantError.message);
    }

    const { count: tablesCount, error: tablesError } = await supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    if (tablesError) {
      throw new Error(tablesError.message);
    }

    const { count: categoriesCount, error: categoriesError } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);

    if (categoriesError) {
      throw new Error(categoriesError.message);
    }

    return NextResponse.json({
      restaurant,
      tablesCount: tablesCount ?? 0,
      categoriesCount: categoriesCount ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar restaurante.",
      },
      { status: 401 },
    );
  }
}