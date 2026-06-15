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

    const { data, error } = await supabase
      .from("categories")
      .select("id, restaurant_id, name, sort_order, is_active, created_at")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      categories: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar categorias.",
      },
      { status: 401 },
    );
  }
}