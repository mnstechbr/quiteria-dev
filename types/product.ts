export type PreparationArea = "KITCHEN" | "BAR";

export type Product = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  preparation_area: PreparationArea;
  is_active: boolean | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string | null;
};

export type CreateProductInput = {
  name: string;
  description?: string;
  price: number;
  category_id: string;
  preparation_area: PreparationArea;
  is_featured?: boolean;
};