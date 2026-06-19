import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return 401;
  if (error instanceof Error && error.message === "FORBIDDEN") return 403;
  if (error instanceof Error && error.message === "NOT_FOUND") return 404;
  return 400;
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
}

async function getRestaurantOrThrow(restaurantId: string) {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, slug, is_active, setup_status, manager_email, created_at, updated_at")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("NOT_FOUND");
  }

  return data;
}

async function restaurantHasHistory(restaurantId: string) {
  const [ordersResult, sessionsResult] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
    supabaseAdmin
      .from("table_sessions")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId),
  ]);

  if (ordersResult.error) {
    throw new Error(`Erro ao verificar pedidos: ${ordersResult.error.message}`);
  }

  if (sessionsResult.error) {
    throw new Error(`Erro ao verificar sessões: ${sessionsResult.error.message}`);
  }

  return Boolean((ordersResult.count ?? 0) > 0 || (sessionsResult.count ?? 0) > 0);
}

async function updateRestaurantUsers(restaurantId: string, isActive: boolean) {
  const { error } = await supabaseAdmin
    .from("restaurant_users")
    .update({ is_active: isActive })
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(`Erro ao atualizar acessos do restaurante: ${error.message}`);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  try {
    await requireSuperAdmin(request);

    const { restaurantId } = await context.params;
    const body = await request.json();
    const action = String(body.action ?? "").toUpperCase();

    if (!restaurantId) {
      throw new Error("Restaurante inválido.");
    }

    await getRestaurantOrThrow(restaurantId);

    if (action !== "ACTIVATE" && action !== "SUSPEND") {
      throw new Error("Ação inválida.");
    }

    const nextState =
      action === "ACTIVATE"
        ? { is_active: true, setup_status: "ACTIVE" }
        : { is_active: false, setup_status: "SUSPENDED" };

    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .update(nextState)
      .eq("id", restaurantId)
      .select("id, name, slug, is_active, setup_status, manager_email, created_at, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await updateRestaurantUsers(restaurantId, action === "ACTIVATE");

    return NextResponse.json({
      restaurant: data,
      message:
        action === "ACTIVATE"
          ? "Restaurante ativado com sucesso."
          : "Restaurante desativado com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar restaurante.",
      },
      { status: normalizeErrorStatus(error) },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  try {
    await requireSuperAdmin(request);

    const { restaurantId } = await context.params;

    if (!restaurantId) {
      throw new Error("Restaurante inválido.");
    }

    await getRestaurantOrThrow(restaurantId);

    const hasHistory = await restaurantHasHistory(restaurantId);

    if (hasHistory) {
      const { data, error } = await supabaseAdmin
        .from("restaurants")
        .update({
          is_active: false,
          setup_status: "SUSPENDED",
        })
        .eq("id", restaurantId)
        .select("id, name, slug, is_active, setup_status, manager_email, created_at, updated_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await updateRestaurantUsers(restaurantId, false);

      return NextResponse.json({
        restaurant: data,
        action: "SUSPENDED",
        message:
          "Este restaurante possui histórico. Ele foi desativado para preservar pedidos, mesas e relatórios.",
      });
    }

    const deleteOperations = [
      supabaseAdmin.from("restaurant_users").delete().eq("restaurant_id", restaurantId),
      supabaseAdmin.from("restaurant_settings").delete().eq("restaurant_id", restaurantId),
      supabaseAdmin.from("products").delete().eq("restaurant_id", restaurantId),
      supabaseAdmin.from("categories").delete().eq("restaurant_id", restaurantId),
      supabaseAdmin.from("tables").delete().eq("restaurant_id", restaurantId),
    ];

    for (const operation of deleteOperations) {
      const { error } = await operation;

      if (error) {
        throw new Error(error.message);
      }
    }

    const { error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .delete()
      .eq("id", restaurantId);

    if (restaurantError) {
      throw new Error(restaurantError.message);
    }

    return NextResponse.json({
      action: "DELETED",
      message: "Restaurante removido com sucesso.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao remover restaurante.",
      },
      { status: normalizeErrorStatus(error) },
    );
  }
}
