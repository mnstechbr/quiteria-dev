import { supabase } from "@/lib/supabase/client";
import {
  CreateRestaurantInput,
  Restaurant,
} from "@/types/restaurant";

export async function listRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug, is_active, setup_status, manager_email, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createRestaurant(
  input: CreateRestaurantInput,
): Promise<Restaurant> {
  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: input.name,
      slug: input.slug,
      setup_status: "PENDING",
    })
    .select(
      "id, name, slug, is_active, setup_status, manager_email, created_at, updated_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function createRestaurantSettings(
  restaurantId: string,
): Promise<void> {
  const { error } = await supabase
    .from("restaurant_settings")
    .insert({
      restaurant_id: restaurantId,
      primary_color: "#f97316",
      secondary_color: "#111827",
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createDefaultRestaurantTables(
  restaurantId: string,
  tableNames: string[],
): Promise<void> {
  const tables = tableNames.map((name) => ({
    restaurant_id: restaurantId,
    name,
    qr_token: crypto.randomUUID(),
  }));

  const { error } = await supabase
    .from("tables")
    .insert(tables);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createDefaultRestaurantCategories(
  restaurantId: string,
  categoryNames: string[],
): Promise<void> {
  const categories = categoryNames.map((name, index) => ({
    restaurant_id: restaurantId,
    name,
    sort_order: index + 1,
    is_active: true,
  }));

  const { error } = await supabase
    .from("categories")
    .insert(categories);

  if (error) {
    throw new Error(error.message);
  }
}