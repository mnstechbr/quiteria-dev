export type TableSessionStatus =
  | "PENDING_APPROVAL"
  | "OPEN"
  | "BILL_REQUESTED"
  | "CLOSED"
  | "CANCELLED";

export type TableSession = {
  id: string;
  restaurant_id: string;
  table_id: string;
  status: TableSessionStatus;
  opened_by: string | null;
  opened_at: string;
  closed_at: string | null;
  total_amount: number;
  approved_by: string | null;
  approved_at: string | null;
  approval_requested_at: string | null;
};