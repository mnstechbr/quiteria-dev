import {
  createRestaurant,
  listRestaurants,
} from "./restaurant-repository";
import {
  CreateRestaurantInput,
  Restaurant,
} from "@/types/restaurant";

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function getRestaurants(): Promise<Restaurant[]> {
  return listRestaurants();
}

export async function registerRestaurant(
  input: CreateRestaurantInput,
): Promise<Restaurant> {
  const name = input.name.trim();
  const slug = normalizeSlug(input.slug || input.name);

  if (!name) {
    throw new Error("Informe o nome do restaurante.");
  }

  if (!slug) {
    throw new Error("Informe um slug válido.");
  }

  return createRestaurant({
    name,
    slug,
  });
}