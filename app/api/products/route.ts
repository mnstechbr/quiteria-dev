import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_PREPARATION_AREAS = ["KITCHEN", "BAR"];

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
      .from("products")
      .select(
        "id, restaurant_id, category_id, name, description, price, image_url, preparation_area, is_active, is_featured, sort_order, created_at",
      )
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      products: data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar produtos.",
      },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, restaurantId } = await requireManager(request);
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const categoryId = String(body.category_id ?? "").trim();
    const preparationArea = String(body.preparation_area ?? "").trim();
    const price = Number(body.price ?? 0);
    const isFeatured = Boolean(body.is_featured ?? false);

    if (!name) {
      throw new Error("Informe o nome do produto.");
    }

    if (!categoryId) {
      throw new Error("Selecione uma categoria.");
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Informe um preço válido.");
    }

    if (!ALLOWED_PREPARATION_AREAS.includes(preparationArea)) {
      throw new Error("Selecione uma área de preparo válida.");
    }

    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .maybeSingle();

    if (categoryError || !category) {
      throw new Error("Categoria inválida para este restaurante.");
    }

    const { data: lastProduct, error: lastProductError } = await supabase
      .from("products")
      .select("sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastProductError) {
      throw new Error(lastProductError.message);
    }

    const nextSortOrder = Number(lastProduct?.sort_order ?? 0) + 1;

    const { data: product, error: createError } = await supabase
      .from("products")
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description: description || null,
        price,
        preparation_area: preparationArea,
        is_active: true,
        is_featured: isFeatured,
        sort_order: nextSortOrder,
      })
      .select(
        "id, restaurant_id, category_id, name, description, price, image_url, preparation_area, is_active, is_featured, sort_order, created_at",
      )
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return NextResponse.json(
      {
        product,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao criar produto.",
      },
      { status: 400 },
    );
  }
}