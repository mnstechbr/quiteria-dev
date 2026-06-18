import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_PREPARATION_AREAS = ["KITCHEN", "BAR"] as const;

type ManagerContext = {
  restaurantId: string;
};

function errorStatus(error: unknown) {
  if (!(error instanceof Error)) return 400;
  if (error.message === "UNAUTHORIZED") return 401;
  if (error.message === "FORBIDDEN") return 403;
  return 400;
}

async function requireManager(request: Request): Promise<ManagerContext> {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const authSupabase = createSupabaseServerClient(token);

  const {
    data: { user },
    error: userError,
  } = await authSupabase.auth.getUser();

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
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
    restaurantId: membership.restaurant_id as string,
  };
}

async function validateCategory({
  restaurantId,
  categoryId,
  requireActive = false,
}: {
  restaurantId: string;
  categoryId: string;
  requireActive?: boolean;
}) {
  let query = supabaseAdmin
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId);

  if (requireActive) {
    query = query.eq("is_active", true);
  }

  const { data: category, error } = await query.maybeSingle();

  if (error || !category) {
    throw new Error("Categoria inválida para este restaurante.");
  }
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizePrice(value: unknown) {
  if (typeof value === "string") {
    return Number(value.replace(",", "."));
  }

  return Number(value ?? 0);
}

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);

    const { data, error } = await supabaseAdmin
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
      { status: errorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const body = await request.json();

    const name = normalizeText(body.name);
    const description = normalizeText(body.description);
    const categoryId = normalizeText(body.category_id);
    const imageUrl = normalizeText(body.image_url);
    const preparationArea = normalizeText(body.preparation_area);
    const price = normalizePrice(body.price);
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

    if (!ALLOWED_PREPARATION_AREAS.includes(preparationArea as (typeof ALLOWED_PREPARATION_AREAS)[number])) {
      throw new Error("Selecione uma área de preparo válida.");
    }

    await validateCategory({ restaurantId, categoryId, requireActive: true });

    const { data: lastProduct, error: lastProductError } = await supabaseAdmin
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

    const { data: product, error: createError } = await supabaseAdmin
      .from("products")
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description: description || null,
        price,
        image_url: imageUrl || null,
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
          error instanceof Error ? error.message : "Erro ao criar produto.",
      },
      { status: errorStatus(error) },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const body = await request.json();

    const id = normalizeText(body.id);
    const name = normalizeText(body.name);
    const description = normalizeText(body.description);
    const categoryId = normalizeText(body.category_id);
    const imageUrl = normalizeText(body.image_url);
    const preparationArea = normalizeText(body.preparation_area);
    const price = normalizePrice(body.price);
    const isFeatured = Boolean(body.is_featured ?? false);
    const isActive = Boolean(body.is_active ?? false);

    if (!id) {
      throw new Error("Informe o produto.");
    }

    if (!name) {
      throw new Error("Informe o nome do produto.");
    }

    if (!categoryId) {
      throw new Error("Selecione uma categoria.");
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Informe um preço válido.");
    }

    if (!ALLOWED_PREPARATION_AREAS.includes(preparationArea as (typeof ALLOWED_PREPARATION_AREAS)[number])) {
      throw new Error("Selecione uma área de preparo válida.");
    }

    await validateCategory({ restaurantId, categoryId });

    const { data: product, error } = await supabaseAdmin
      .from("products")
      .update({
        category_id: categoryId,
        name,
        description: description || null,
        price,
        image_url: imageUrl || null,
        preparation_area: preparationArea,
        is_active: isActive,
        is_featured: isFeatured,
      })
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .select(
        "id, restaurant_id, category_id, name, description, price, image_url, preparation_area, is_active, is_featured, sort_order, created_at",
      )
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!product) {
      throw new Error("Produto não encontrado para este restaurante.");
    }

    return NextResponse.json({
      product,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar produto.",
      },
      { status: errorStatus(error) },
    );
  }
}
