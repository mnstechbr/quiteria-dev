export type UserRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "CASHIER"
  | "WAITER"
  | "KITCHEN"
  | "BAR";

export type UserProfile = {
  id: string;
  full_name: string | null;
  global_role: "SUPER_ADMIN" | "USER";
  created_at: string;
  updated_at: string;
};