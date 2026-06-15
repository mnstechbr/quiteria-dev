import {
  createDefaultRestaurantCategories,
  createDefaultRestaurantTables,
  createRestaurant,
  createRestaurantSettings,
  listRestaurants,
} from "./restaurant-repository";
import {
  CreateRestaurantInput,
  DefaultRestaurantSetup,
  Restaurant,
} from "@/types/restaurant";

export const DEFAULT_RESTAURANT_SETUP: DefaultRestaurantSetup = {
  tables: [
    "Mesa 01",
    "Mesa 02",
    "Mesa 03",
    "Mesa 04",
    "Mesa 05",
    "Mesa 06",
    "Mesa 07",
    "Mesa 08",
    "Mesa 09",
    "Mesa 10",
  ],
  categories: [
    "Lanches",
    "Porções",
    "Bebidas",
    "Drinks",
    "Sobremesas",
  ],
};

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

  const restaurant = await createRestaurant({
    name,
    slug,
  });

  try {
    await createRestaurantSettings(restaurant.id);

    await createDefaultRestaurantTables(
      restaurant.id,
      DEFAULT_RESTAURANT_SETUP.tables,
    );

    await createDefaultRestaurantCategories(
      restaurant.id,
      DEFAULT_RESTAURANT_SETUP.categories,
    );

    return restaurant;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Restaurante criado, mas houve erro no setup inicial: ${error.message}`
        : "Restaurante criado, mas houve erro no setup inicial.",
    );
  }
}