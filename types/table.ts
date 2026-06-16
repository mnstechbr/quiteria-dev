export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  name: string;
  qr_token: string;
  is_active: boolean | null;
  created_at: string | null;
};

export type TableOperationalStatus =
  | "AVAILABLE"
  | "PENDING_APPROVAL"
  | "OPEN"
  | "BILL_REQUESTED"
  | "CLOSED";

export type TableWithStatus = RestaurantTable & {
  operational_status: TableOperationalStatus;
  active_session_id: string | null;
};