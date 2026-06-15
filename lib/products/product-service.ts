import { listProducts } from "./product-repository";
import { Product } from "@/types/product";

export async function getProducts(
  restaurantId: string,
): Promise<Product[]> {
  return listProducts(restaurantId);
}