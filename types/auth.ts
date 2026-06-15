export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "WAITER"
  | "KITCHEN"
  | "BAR";

export type GlobalRole = "SUPER_ADMIN" | "USER";

export type UserProfile = {
  id: string;
  full_name: string | null;
  global_role: GlobalRole;
  created_at: string;
  updated_at: string;
};

export type RestaurantUser = {
  id: string;
  restaurant_id: string;
  user_id: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};