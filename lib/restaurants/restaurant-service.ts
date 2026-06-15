import { listRestaurants } from "./restaurant-repository";
import { Restaurant } from "@/types/restaurant";

export async function getRestaurants(): Promise<Restaurant[]> {
  return listRestaurants();
}