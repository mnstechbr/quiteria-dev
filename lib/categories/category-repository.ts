import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";

export async function listCategories(
  restaurantId: string,
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(
      "id, restaurant_id, name, sort_order, is_active, created_at",
    )
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}