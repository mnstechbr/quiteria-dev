"use client";

import { useEffect, useState } from "react";
import { CategoryList } from "@/components/manager/CategoryList";
import { CreateCategoryForm } from "@/components/manager/CreateCategoryForm";
import { CreateProductForm } from "@/components/manager/CreateProductForm";
import { ProductList } from "@/components/manager/ProductList";
import { TableGrid } from "@/components/manager/TableGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { Product } from "@/types/product";
import { Restaurant } from "@/types/restaurant";
import { TableWithStatus } from "@/types/table";

type ManagerRestaurantOverview = {
  restaurant: Restaurant;
  tablesCount: number;
  categoriesCount: number;
};

function getStatusLabel(status: string) {
  if (status === "PENDING") return "Configuração pendente";
  if (status === "ACTIVE") return "Ativo";
  if (status === "SUSPENDED") return "Suspenso";
  return status;
}

export default function ManagerPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [userName, setUserName] = useState("");
  const [overview, setOverview] = useState<ManagerRestaurantOverview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<TableWithStatus[]>([]);
  const [approvingTableId, setApprovingTableId] = useState<string | null>(null);
  const [tableMessage, setTableMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initializePage() {
      try {
        const session = await getCurrentSession();

        if (!session) {
          window.location.replace("/login");
          return;
        }

        if (session.profile?.global_role === "SUPER_ADMIN") {
          window.location.replace("/master");
          return;
        }

        if (session.restaurantMembership?.role !== "MANAGER") {
          window.location.replace("/login");
          return;
        }

        setUserName(session.profile?.full_name ?? session.user.email ?? "Gerente");
        setAllowed(true);

        await Promise.all([
          loadRestaurantOverview(),
          loadCategories(),
          loadProducts(),
          loadTables(),
        ]);
      } catch {
        window.location.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    initializePage();
  }, []);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada.");
    }

    return session.access_token;
  }

  async function loadRestaurantOverview() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/manager/restaurant", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar restaurante.");
    }

    const data = await response.json();

    setOverview({
      restaurant: data.restaurant,
      tablesCount: data.tablesCount ?? 0,
      categoriesCount: data.categoriesCount ?? 0,
    });
  }

  async function loadCategories() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/categories", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar categorias.");
    }

    const data = await response.json();
    setCategories(data.categories ?? []);
  }

  async function loadProducts() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/products", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar produtos.");
    }

    const data = await response.json();
    setProducts(data.products ?? []);
  }

  async function loadTables() {
    const accessToken = await getAccessToken();

    const response = await fetch("/api/tables", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar mesas.");
    }

    const data = await response.json();
    setTables(data.tables ?? []);
  }

  function handleCategoryCreated(category: Category) {
    setCategories((currentCategories) => [...currentCategories, category]);

    setOverview((currentOverview) =>
      currentOverview
        ? {
            ...currentOverview,
            categoriesCount: currentOverview.categoriesCount + 1,
          }
        : currentOverview,
    );
  }

  function handleProductCreated(product: Product) {
    setProducts((currentProducts) => [...currentProducts, product]);
  }

  async function handleApproveTableSession(tableId: string) {
    try {
      setApprovingTableId(tableId);
      setTableMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/tables", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tableId,
          action: "APPROVE_SESSION",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao aprovar mesa.");
      }

      setTables((currentTables) =>
        currentTables.map((table) =>
          table.id === tableId
            ? {
                ...table,
                operational_status: "OPEN",
                active_session_id:
                  data.table?.active_session_id ?? table.active_session_id,
              }
            : table,
        ),
      );

      setTableMessage("Mesa aprovada com sucesso.");
    } catch (error) {
      setTableMessage(
        error instanceof Error ? error.message : "Erro ao aprovar mesa.",
      );
    } finally {
      setApprovingTableId(null);
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando painel...
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-orange-400">
              Painel do Restaurante
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight">
              Quitéria
            </h1>

            <p className="mt-3 text-zinc-400">Bem-vindo, {userName}.</p>
          </div>

          <Button
            type="button"
            onClick={handleLogout}
            className="border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white"
          >
            Sair
          </Button>
        </div>

        {overview && (
          <Card>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-zinc-400">Restaurante</p>

                <h2 className="mt-2 text-2xl font-semibold">
                  {overview.restaurant.name}
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  /{overview.restaurant.slug}
                </p>
              </div>

              <Badge>{getStatusLabel(overview.restaurant.setup_status)}</Badge>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-400">Mesas cadastradas</p>
                <p className="mt-2 text-3xl font-bold">
                  {overview.tablesCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-400">Categorias cadastradas</p>
                <p className="mt-2 text-3xl font-bold">
                  {overview.categoriesCount}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
                <p className="text-sm text-zinc-400">Produtos cadastrados</p>
                <p className="mt-2 text-3xl font-bold">{products.length}</p>
              </div>
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Mesas</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Mesas cadastradas e tokens de QR Code do restaurante.
            </p>

            {tableMessage && (
              <p className="mt-3 text-sm text-zinc-300">{tableMessage}</p>
            )}
          </div>

          <TableGrid
            tables={tables}
            approvingTableId={approvingTableId}
            onApproveSession={handleApproveTableSession}
          />
        </Card>

        <CreateCategoryForm onCreated={handleCategoryCreated} />

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Categorias</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Categorias atuais do cardápio deste restaurante.
            </p>
          </div>

          <CategoryList categories={categories} />
        </Card>

        <CreateProductForm
          categories={categories.filter((category) => category.is_active)}
          onCreated={handleProductCreated}
        />

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Produtos</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Produtos cadastrados para o cardápio deste restaurante.
            </p>
          </div>

          <ProductList products={products} />
        </Card>
      </section>
    </main>
  );
}
