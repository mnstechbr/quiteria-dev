import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth/request-auth";
import { getProfileByUserId, isSuperAdmin } from "@/lib/auth/profile-service";
import {
  getRestaurants,
  registerRestaurant,
} from "@/lib/restaurants/restaurant-service";

async function requireSuperAdminFromRequest(request: Request) {
  const user = await getUserFromRequest(request);

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  const profile = await getProfileByUserId(user.id);

  if (!isSuperAdmin(profile)) {
    throw new Error("FORBIDDEN");
  }

  return {
    user,
    profile,
  };
}

export async function GET(request: Request) {
  try {
    await requireSuperAdminFromRequest(request);

    const restaurants = await getRestaurants();

    return NextResponse.json({
      restaurants,
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
    await requireSuperAdminFromRequest(request);

    const body = await request.json();

    const restaurant = await registerRestaurant({
      name: body.name,
      slug: body.slug,
    });

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