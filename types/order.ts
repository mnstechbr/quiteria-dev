export type OrderStatus =
  | "WAITING_APPROVAL"
  | "RECEIVED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type OrderItemStatus =
  | "WAITING_APPROVAL"
  | "RECEIVED"
  | "IN_PROGRESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type PreparationArea = "KITCHEN" | "BAR";

export type PendingOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: string;
  preparation_area: PreparationArea;
  created_at: string | null;
};

export type PendingOrder = {
  id: string;
  restaurant_id: string;
  table_session_id: string;
  status: OrderStatus;
  notes: string | null;
  total_amount: number;
  created_at: string | null;
  approved_at: string | null;
  table_name: string;
  items: PendingOrderItem[];
};

export type ProductionOrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  status: OrderItemStatus;
  preparation_area: PreparationArea;
  created_at: string | null;
};

export type ProductionOrder = {
  id: string;
  restaurant_id: string;
  table_session_id: string;
  status: OrderStatus;
  notes: string | null;
  total_amount: number;
  created_at: string | null;
  approved_at: string | null;
  table_name: string;
  items: ProductionOrderItem[];
};
