import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ManagerContext = {
  restaurantId: string;
};

function errorStatus(error: unknown) {
  if (!(error instanceof Error)) return 400;
  if (error.message === "UNAUTHORIZED") return 401;
  if (error.message === "FORBIDDEN") return 403;
  return 400;
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
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

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const url = new URL(request.url);
    const includeInactive = url.searchParams.get("includeInactive") === "true";

    let query = supabaseAdmin
      .from("categories")
      .select("id, restaurant_id, name, sort_order, is_active, created_at")
      .eq("restaurant_id", restaurantId);

    if (!includeInactive) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query.order("sort_order", { ascending: true });

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
      { status: errorStatus(error) },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const body = await request.json();

    const name = normalizeText(body.name);

    if (!name) {
      throw new Error("Informe o nome da categoria.");
    }

    const { data: lastCategory, error: lastCategoryError } = await supabaseAdmin
      .from("categories")
      .select("sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastCategoryError) {
      throw new Error(lastCategoryError.message);
    }

    const nextSortOrder = Number(lastCategory?.sort_order ?? 0) + 1;

    const { data: category, error: createError } = await supabaseAdmin
      .from("categories")
      .insert({
        restaurant_id: restaurantId,
        name,
        sort_order: nextSortOrder,
        is_active: true,
      })
      .select("id, restaurant_id, name, sort_order, is_active, created_at")
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    return NextResponse.json(
      {
        category,
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao criar categoria.",
      },
      { status: errorStatus(error) },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const body = await request.json().catch(() => ({}));
    const id = normalizeText(body.id);

    if (!id) {
      throw new Error("Informe a categoria.");
    }

    const { data: category, error: categoryError } = await supabaseAdmin
      .from("categories")
      .select("id, restaurant_id, name")
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (categoryError) {
      throw new Error(categoryError.message);
    }

    if (!category) {
      throw new Error("Categoria não encontrada para este restaurante.");
    }

    const { data: linkedProducts, error: linkedProductsError } = await supabaseAdmin
      .from("products")
      .select("id")
      .eq("category_id", id)
      .eq("restaurant_id", restaurantId)
      .limit(1);

    if (linkedProductsError) {
      throw new Error(linkedProductsError.message);
    }

    if ((linkedProducts ?? []).length > 0) {
      const { error: deactivateProductsError } = await supabaseAdmin
        .from("products")
        .update({
          is_active: false,
          is_featured: false,
        })
        .eq("category_id", id)
        .eq("restaurant_id", restaurantId);

      if (deactivateProductsError) {
        throw new Error(deactivateProductsError.message);
      }

      const { data: inactiveCategory, error: deactivateCategoryError } = await supabaseAdmin
        .from("categories")
        .update({
          is_active: false,
        })
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .select("id, restaurant_id, name, sort_order, is_active, created_at")
        .single();

      if (deactivateCategoryError) {
        throw new Error(deactivateCategoryError.message);
      }

      return NextResponse.json({
        deleted: false,
        category: inactiveCategory,
        id,
        message:
          "Categoria removida do cardápio com segurança. Os produtos vinculados também foram desativados para preservar o histórico.",
      });
    }

    const { error: deleteError } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

    if (deleteError) {
      const { data: inactiveCategory, error: deactivateCategoryError } = await supabaseAdmin
        .from("categories")
        .update({
          is_active: false,
        })
        .eq("id", id)
        .eq("restaurant_id", restaurantId)
        .select("id, restaurant_id, name, sort_order, is_active, created_at")
        .single();

      if (deactivateCategoryError) {
        throw new Error(deleteError.message);
      }

      return NextResponse.json({
        deleted: false,
        category: inactiveCategory,
        id,
        message:
          "Categoria foi removida do cardápio com segurança porque não pôde ser apagada fisicamente.",
      });
    }

    return NextResponse.json({
      deleted: true,
      id,
      message: "Categoria excluída com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao excluir categoria.",
      },
      { status: errorStatus(error) },
    );
  }
}
