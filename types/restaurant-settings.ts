export type RestaurantSettings = {
  id: string;
  restaurant_id: string;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  default_service_percent: number | null;
  allow_cashier_service_percent_edit: boolean | null;
  require_table_approval: boolean | null;
  require_order_approval: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ManagerSettingsResponse = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    setup_status: string;
  };
  settings: RestaurantSettings | null;
};
