import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBearerToken } from "@/lib/auth/request-auth";

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireSuperAdmin(request: Request) {
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

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, global_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.global_role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return supabase;
}

export async function GET(request: Request) {
  try {
    const supabase = await requireSuperAdmin(request);

    const { data, error } = await supabase
      .from("restaurants")
      .select("id, name, slug, is_active, setup_status, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      restaurants: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao buscar restaurantes.",
      },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await requireSuperAdmin(request);
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const slug = normalizeSlug(String(body.slug || body.name || ""));

    if (!name) {
      throw new Error("Informe o nome do restaurante.");
    }

    if (!slug) {
      throw new Error("Informe um slug válido.");
    }

    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        setup_status: "PENDING",
      })
      .select("id, name, slug, is_active, setup_status, created_at, updated_at")
      .single();

    if (restaurantError) {
      throw new Error(restaurantError.message);
    }

    return NextResponse.json(
      {
        restaurant,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao criar restaurante.",
      },
      { status: 400 },
    );
  }
}