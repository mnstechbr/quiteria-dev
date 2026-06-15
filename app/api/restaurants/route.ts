import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_TABLES = [
  "Mesa 01",
  "Mesa 02",
  "Mesa 03",
  "Mesa 04",
  "Mesa 05",
  "Mesa 06",
  "Mesa 07",
  "Mesa 08",
  "Mesa 09",
  "Mesa 10",
];

const DEFAULT_CATEGORIES = [
  "Lanches",
  "Porções",
  "Bebidas",
  "Drinks",
  "Sobremesas",
];

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

    const { error: settingsError } = await supabase
      .from("restaurant_settings")
      .insert({
        restaurant_id: restaurant.id,
        primary_color: "#f97316",
        secondary_color: "#111827",
      });

    if (settingsError) {
      throw new Error(`Erro ao criar configurações: ${settingsError.message}`);
    }

    const tables = DEFAULT_TABLES.map((tableName) => ({
      restaurant_id: restaurant.id,
      name: tableName,
      qr_token: crypto.randomUUID(),
    }));

    const { error: tablesError } = await supabase
      .from("tables")
      .insert(tables);

    if (tablesError) {
      throw new Error(`Erro ao criar mesas: ${tablesError.message}`);
    }

    const categories = DEFAULT_CATEGORIES.map((categoryName, index) => ({
      restaurant_id: restaurant.id,
      name: categoryName,
      sort_order: index + 1,
      is_active: true,
    }));

    const { error: categoriesError } = await supabase
      .from("categories")
      .insert(categories);

    if (categoriesError) {
      throw new Error(`Erro ao criar categorias: ${categoriesError.message}`);
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