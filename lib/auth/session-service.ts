import { getCurrentUser } from "./auth-service";
import { getProfileByUserId } from "./profile-service";
import { supabase } from "@/lib/supabase/client";
import { RestaurantUser } from "@/types/auth";

async function getRestaurantMembership(
  userId: string,
): Promise<RestaurantUser | null> {
  const { data, error } = await supabase
    .from("restaurant_users")
    .select(
      "id, restaurant_id, user_id, role, is_active, created_at",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCurrentSession() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const profile = await getProfileByUserId(user.id);

  const restaurantMembership =
    profile?.global_role === "USER"
      ? await getRestaurantMembership(user.id)
      : null;

  return {
    user,
    profile,
    restaurantMembership,
  };
}