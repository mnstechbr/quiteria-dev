export type Restaurant = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RestaurantSettings = {
  id: string;
  restaurant_id: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateRestaurantInput = {
  name: string;
  slug: string;
};

export type RestaurantListItem = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
};