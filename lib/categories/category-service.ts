import { listCategories } from "./category-repository";
import { Category } from "@/types/category";

export async function getCategories(
  restaurantId: string,
): Promise<Category[]> {
  return listCategories(restaurantId);
}