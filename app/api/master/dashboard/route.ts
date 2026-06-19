import { NextResponse } from "next/server";
import { getBearerToken } from "@/lib/auth/request-auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Restaurant } from "@/types/restaurant";

type RestaurantStats = {
  tables_total: number;
  active_tables: number;
  products_total: number;
  active_products: number;
  categories_total: number;
  active_categories: number;
  active_sessions: number;
  orders_today: number;
  orders_total: number;
  closed_accounts_today: number;
  revenue_today: number;
  revenue_total: number;
  average_ticket_today: number;
  last_order_at: string | null;
};

type RestaurantWithStats = Restaurant & {
  stats: RestaurantStats;
};

type OrderRow = {
  id: string;
  restaurant_id: string;
  total_amount: number | string | null;
  status: string | null;
  created_at: string | null;
};

type SessionRow = {
  id: string;
  restaurant_id: string;
  status: string | null;
  total_amount: number | string | null;
  opened_at: string | null;
  closed_at: string | null;
};

function normalizeErrorStatus(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") return 401;
  if (error instanceof Error && error.message === "FORBIDDEN") return 403;
  return 400;
}

async function requireSuperAdmin(request: Request) {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const supabase = createSupabaseServerClient(token);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("UNAUTHORIZED");
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, global_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.global_role !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN");
  }
}

function getSaoPauloTodayRange() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    const now = new Date();
    const fallback = now.toISOString().slice(0, 10);
    return {
      start: `${fallback}T00:00:00-03:00`,
      end: `${fallback}T23:59:59.999-03:00`,
    };
  }

  return {
    start: `${year}-${month}-${day}T00:00:00-03:00`,
    end: `${year}-${month}-${day}T23:59:59.999-03:00`,
  };
}

function isBetween(dateValue: string | null | undefined, start: Date, end: Date) {
  if (!dateValue) return false;

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return false;

  return date >= start && date <= end;
}

function toNumber(value: number | string | null | undefined) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function createEmptyStats(): RestaurantStats {
  return {
    tables_total: 0,
    active_tables: 0,
    products_total: 0,
    active_products: 0,
    categories_total: 0,
    active_categories: 0,
    active_sessions: 0,
    orders_today: 0,
    orders_total: 0,
    closed_accounts_today: 0,
    revenue_today: 0,
    revenue_total: 0,
    average_ticket_today: 0,
    last_order_at: null,
  };
}

function getStats(map: Map<string, RestaurantStats>, restaurantId: string) {
  const currentStats = map.get(restaurantId);

  if (currentStats) return currentStats;

  const newStats = createEmptyStats();
  map.set(restaurantId, newStats);
  return newStats;
}

async function listOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, restaurant_id, total_amount, status, created_at");

  if (!error) {
    return (data ?? []) as OrderRow[];
  }

  if (!/created_at/i.test(error.message)) {
    throw new Error(`Erro ao buscar pedidos: ${error.message}`);
  }

  const fallback = await supabaseAdmin
    .from("orders")
    .select("id, restaurant_id, total_amount, status, opened_at");

  if (fallback.error) {
    throw new Error(`Erro ao buscar pedidos: ${fallback.error.message}`);
  }

  return (fallback.data ?? []).map((order) => ({
    id: String(order.id),
    restaurant_id: String(order.restaurant_id),
    total_amount: order.total_amount ?? 0,
    status: order.status ?? null,
    created_at: order.opened_at ?? null,
  }));
}

export async function GET(request: Request) {
  try {
    await requireSuperAdmin(request);

    const todayRange = getSaoPauloTodayRange();
    const todayStart = new Date(todayRange.start);
    const todayEnd = new Date(todayRange.end);

    const [
      restaurantsResult,
      tablesResult,
      productsResult,
      categoriesResult,
      sessionsResult,
      orders,
    ] = await Promise.all([
      supabaseAdmin
        .from("restaurants")
        .select(
          "id, name, slug, is_active, setup_status, manager_email, created_at, updated_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("tables").select("id, restaurant_id, is_active"),
      supabaseAdmin.from("products").select("id, restaurant_id, is_active"),
      supabaseAdmin.from("categories").select("id, restaurant_id, is_active"),
      supabaseAdmin
        .from("table_sessions")
        .select("id, restaurant_id, status, total_amount, opened_at, closed_at"),
      listOrders(),
    ]);

    if (restaurantsResult.error) {
      throw new Error(`Erro ao buscar restaurantes: ${restaurantsResult.error.message}`);
    }

    if (tablesResult.error) {
      throw new Error(`Erro ao buscar mesas: ${tablesResult.error.message}`);
    }

    if (productsResult.error) {
      throw new Error(`Erro ao buscar produtos: ${productsResult.error.message}`);
    }

    if (categoriesResult.error) {
      throw new Error(`Erro ao buscar categorias: ${categoriesResult.error.message}`);
    }

    if (sessionsResult.error) {
      throw new Error(`Erro ao buscar sessões: ${sessionsResult.error.message}`);
    }

    const restaurants = (restaurantsResult.data ?? []) as Restaurant[];
    const restaurantStatsMap = new Map<string, RestaurantStats>();

    restaurants.forEach((restaurant) => {
      restaurantStatsMap.set(restaurant.id, createEmptyStats());
    });

    (tablesResult.data ?? []).forEach((table) => {
      const stats = getStats(restaurantStatsMap, String(table.restaurant_id));
      stats.tables_total += 1;
      if (table.is_active !== false) stats.active_tables += 1;
    });

    (productsResult.data ?? []).forEach((product) => {
      const stats = getStats(restaurantStatsMap, String(product.restaurant_id));
      stats.products_total += 1;
      if (product.is_active !== false) stats.active_products += 1;
    });

    (categoriesResult.data ?? []).forEach((category) => {
      const stats = getStats(restaurantStatsMap, String(category.restaurant_id));
      stats.categories_total += 1;
      if (category.is_active !== false) stats.active_categories += 1;
    });

    const sessions = (sessionsResult.data ?? []) as SessionRow[];

    sessions.forEach((session) => {
      const stats = getStats(restaurantStatsMap, String(session.restaurant_id));
      const status = String(session.status ?? "").toUpperCase();
      const isClosed = status === "CLOSED";
      const isCancelled = status === "CANCELLED";
      const closedToday = isClosed && isBetween(session.closed_at, todayStart, todayEnd);
      const amount = toNumber(session.total_amount);

      if (!isClosed && !isCancelled) {
        stats.active_sessions += 1;
      }

      if (isClosed) {
        stats.revenue_total += amount;
      }

      if (closedToday) {
        stats.closed_accounts_today += 1;
        stats.revenue_today += amount;
      }
    });

    const orderRevenueTodayByRestaurant = new Map<string, number>();

    orders.forEach((order) => {
      const restaurantId = String(order.restaurant_id);
      const stats = getStats(restaurantStatsMap, restaurantId);
      const createdToday = isBetween(order.created_at, todayStart, todayEnd);
      const amount = toNumber(order.total_amount);

      stats.orders_total += 1;

      if (createdToday) {
        stats.orders_today += 1;
        orderRevenueTodayByRestaurant.set(
          restaurantId,
          (orderRevenueTodayByRestaurant.get(restaurantId) ?? 0) + amount,
        );
      }

      if (order.created_at) {
        const currentLastDate = stats.last_order_at
          ? new Date(stats.last_order_at).getTime()
          : 0;
        const orderDate = new Date(order.created_at).getTime();

        if (!Number.isNaN(orderDate) && orderDate > currentLastDate) {
          stats.last_order_at = order.created_at;
        }
      }
    });

    const restaurantsWithStats: RestaurantWithStats[] = restaurants.map((restaurant) => {
      const stats = getStats(restaurantStatsMap, restaurant.id);

      if (stats.revenue_today <= 0 && stats.orders_today > 0) {
        stats.revenue_today = orderRevenueTodayByRestaurant.get(restaurant.id) ?? 0;
      }

      stats.average_ticket_today =
        stats.closed_accounts_today > 0
          ? stats.revenue_today / stats.closed_accounts_today
          : stats.orders_today > 0
            ? stats.revenue_today / stats.orders_today
            : 0;

      return {
        ...restaurant,
        stats,
      };
    });

    const platform = restaurantsWithStats.reduce(
      (accumulator, restaurant) => {
        const stats = restaurant.stats;

        accumulator.total_restaurants += 1;
        accumulator.active_restaurants +=
          restaurant.is_active && restaurant.setup_status === "ACTIVE" ? 1 : 0;
        accumulator.pending_restaurants +=
          restaurant.setup_status === "PENDING" ? 1 : 0;
        accumulator.suspended_restaurants +=
          !restaurant.is_active || restaurant.setup_status === "SUSPENDED" ? 1 : 0;
        accumulator.with_manager += restaurant.manager_email ? 1 : 0;
        accumulator.without_manager += restaurant.manager_email ? 0 : 1;
        accumulator.tables_total += stats.tables_total;
        accumulator.active_tables += stats.active_tables;
        accumulator.products_total += stats.products_total;
        accumulator.active_products += stats.active_products;
        accumulator.categories_total += stats.categories_total;
        accumulator.active_sessions += stats.active_sessions;
        accumulator.orders_today += stats.orders_today;
        accumulator.orders_total += stats.orders_total;
        accumulator.closed_accounts_today += stats.closed_accounts_today;
        accumulator.revenue_today += stats.revenue_today;
        accumulator.revenue_total += stats.revenue_total;
        accumulator.restaurants_with_movement_today +=
          stats.orders_today > 0 || stats.revenue_today > 0 ? 1 : 0;

        return accumulator;
      },
      {
        total_restaurants: 0,
        active_restaurants: 0,
        pending_restaurants: 0,
        suspended_restaurants: 0,
        with_manager: 0,
        without_manager: 0,
        tables_total: 0,
        active_tables: 0,
        products_total: 0,
        active_products: 0,
        categories_total: 0,
        active_sessions: 0,
        orders_today: 0,
        orders_total: 0,
        closed_accounts_today: 0,
        revenue_today: 0,
        revenue_total: 0,
        restaurants_with_movement_today: 0,
        average_ticket_today: 0,
      },
    );

    platform.average_ticket_today =
      platform.closed_accounts_today > 0
        ? platform.revenue_today / platform.closed_accounts_today
        : platform.orders_today > 0
          ? platform.revenue_today / platform.orders_today
          : 0;

    return NextResponse.json({
      platform,
      restaurants: restaurantsWithStats,
      today: todayRange,
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Erro ao carregar painel master.",
      },
      { status: normalizeErrorStatus(error) },
    );
  }
}
