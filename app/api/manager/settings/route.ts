import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    restaurantId: membership.restaurant_id as string,
  };
}

export async function GET(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, slug, is_active, setup_status")
      .eq("id", restaurantId)
      .single();

    if (restaurantError) {
      throw new Error(restaurantError.message);
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("restaurant_settings")
      .select(
        "id, restaurant_id, logo_url, banner_url, primary_color, secondary_color, default_service_percent, allow_cashier_service_percent_edit, require_table_approval, require_order_approval, created_at, updated_at",
      )
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    return NextResponse.json({
      restaurant,
      settings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar configurações.",
      },
      { status: 401 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { restaurantId } = await requireManager(request);
    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const slug = normalizeSlug(String(body.slug ?? ""));
    const logoUrl = String(body.logo_url ?? "").trim();
    const bannerUrl = String(body.banner_url ?? "").trim();
    const primaryColor = String(body.primary_color ?? "").trim();
    const secondaryColor = String(body.secondary_color ?? "").trim();

    const defaultServicePercent = Number(body.default_service_percent ?? 0);
    const allowCashierServicePercentEdit = Boolean(
      body.allow_cashier_service_percent_edit ?? true,
    );
    const requireTableApproval = Boolean(body.require_table_approval ?? true);
    const requireOrderApproval = Boolean(body.require_order_approval ?? true);

    if (!name) {
      throw new Error("Informe o nome do restaurante.");
    }

    if (!slug) {
      throw new Error("Informe um slug válido.");
    }

    if (!Number.isFinite(defaultServicePercent) || defaultServicePercent < 0) {
      throw new Error("Informe uma taxa de serviço válida.");
    }

    const { data: updatedRestaurant, error: restaurantError } =
      await supabaseAdmin
        .from("restaurants")
        .update({
          name,
          slug,
        })
        .eq("id", restaurantId)
        .select("id, name, slug, is_active, setup_status")
        .single();

    if (restaurantError) {
      throw new Error(restaurantError.message);
    }

    const { data: updatedSettings, error: settingsError } = await supabaseAdmin
      .from("restaurant_settings")
      .upsert(
        {
          restaurant_id: restaurantId,
          logo_url: logoUrl || null,
          banner_url: bannerUrl || null,
          primary_color: primaryColor || "#f97316",
          secondary_color: secondaryColor || "#111827",
          default_service_percent: defaultServicePercent,
          allow_cashier_service_percent_edit: allowCashierServicePercentEdit,
          require_table_approval: requireTableApproval,
          require_order_approval: requireOrderApproval,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "restaurant_id",
        },
      )
      .select(
        "id, restaurant_id, logo_url, banner_url, primary_color, secondary_color, default_service_percent, allow_cashier_service_percent_edit, require_table_approval, require_order_approval, created_at, updated_at",
      )
      .single();

    if (settingsError) {
      throw new Error(settingsError.message);
    }

    return NextResponse.json({
      restaurant: updatedRestaurant,
      settings: updatedSettings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao salvar configurações.",
      },
      { status: 400 },
    );
  }
}
