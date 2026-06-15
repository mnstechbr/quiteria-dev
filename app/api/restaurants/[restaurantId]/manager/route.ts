import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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

  return user;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ restaurantId: string }> },
) {
  try {
    await requireSuperAdmin(request);

    const { restaurantId } = await context.params;
    const body = await request.json();

    const fullName = String(body.fullName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!fullName) {
      throw new Error("Informe o nome do gerente.");
    }

    if (!email) {
      throw new Error("Informe o e-mail do gerente.");
    }

    if (password.length < 8) {
      throw new Error("A senha temporária precisa ter pelo menos 8 caracteres.");
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

    if (authError) {
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Não foi possível criar o usuário do gerente.");
    }

    const managerUserId = authData.user.id;

    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .upsert({
        id: managerUserId,
        full_name: fullName,
        global_role: "USER",
      });

    if (profileError) {
      throw new Error(`Erro ao criar perfil do gerente: ${profileError.message}`);
    }

    const { error: restaurantUserError } = await supabaseAdmin
      .from("restaurant_users")
      .upsert({
        restaurant_id: restaurantId,
        user_id: managerUserId,
        role: "MANAGER",
        is_active: true,
      });

    if (restaurantUserError) {
      throw new Error(
        `Erro ao vincular gerente ao restaurante: ${restaurantUserError.message}`,
      );
    }

    const { error: restaurantUpdateError } = await supabaseAdmin
      .from("restaurants")
      .update({
        manager_email: email,
      })
      .eq("id", restaurantId);

    if (restaurantUpdateError) {
      throw new Error(
        `Gerente criado, mas houve erro ao atualizar restaurante: ${restaurantUpdateError.message}`,
      );
    }

    return NextResponse.json({
      manager: {
        id: managerUserId,
        full_name: fullName,
        email,
        role: "MANAGER",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao criar gerente.",
      },
      { status: 400 },
    );
  }
}