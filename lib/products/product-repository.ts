import { supabase } from "@/lib/supabase/client";
import { Product } from "@/types/product";

export async function listProducts(
  restaurantId: string,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      restaurant_id,
      category_id,
      name,
      description,
      price,
      image_url,
      preparation_area,
      is_active,
      is_featured,
      sort_order,
      created_at
    `)
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}