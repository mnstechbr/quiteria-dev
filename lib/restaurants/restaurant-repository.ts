import { supabase } from "@/lib/supabase/client";
import {
  CreateRestaurantInput,
  Restaurant,
} from "@/types/restaurant";

export async function listRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, slug, is_active, created_at, updated_at")
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
    })
    .select("id, name, slug, is_active, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}