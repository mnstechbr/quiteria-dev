import { supabase } from "@/lib/supabase/client";
import { Restaurant } from "@/types/restaurant";

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