export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
};

export type CreateCategoryInput = {
  name: string;
};

export type UpdateCategoryInput = {
  id: string;
  name?: string;
  is_active?: boolean;
};