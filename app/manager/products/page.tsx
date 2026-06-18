"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateProductForm } from "@/components/manager/CreateProductForm";
import {
  ManagerMobileShell,
  MobileMetricCard,
  MobileSectionCard,
} from "@/components/manager/ManagerMobileShell";
import { ProductList } from "@/components/manager/ProductList";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";
import { Product } from "@/types/product";

export default function ManagerProductsPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const activeProducts = useMemo(
    () => products.filter((product) => product.is_active).length,
    [products],
  );

  const featuredProducts = useMemo(
    () => products.filter((product) => product.is_featured).length,
    [products],
  );

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

        setAllowed(true);
        await Promise.allSettled([loadCategories(), loadProducts()]);
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

  function handleProductCreated(product: Product) {
    setProducts((currentProducts) => [...currentProducts, product]);
    setMessage("Produto criado com sucesso.");
  }

  function handleProductUpdated(product: Product) {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id ? product : currentProduct,
      ),
    );
    setMessage("Produto atualizado com sucesso.");
  }

  async function handleRefresh() {
    try {
      setMessage(null);
      await Promise.all([loadCategories(), loadProducts()]);
      setMessage("Produtos atualizados.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao atualizar produtos.",
      );
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center text-sm text-white">
        Carregando produtos...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <ManagerMobileShell
      title="Produtos"
      description="Cadastre, edite, destaque e organize os itens do cardápio."
      activeHref="/manager/products"
      action={
        <CreateProductForm
          categories={categories.filter((category) => category.is_active)}
          onCreated={handleProductCreated}
        />
      }
      onLogout={handleLogout}
    >
      <div className="grid grid-cols-3 gap-3">
        <MobileMetricCard label="Total" value={products.length} />
        <MobileMetricCard label="Ativos" value={activeProducts} />
        <MobileMetricCard label="Destaque" value={featuredProducts} />
      </div>

      {categories.filter((category) => category.is_active).length === 0 && (
        <div className="rounded-3xl border border-yellow-300/30 bg-yellow-300/10 p-4 text-sm leading-relaxed text-yellow-100">
          Cadastre uma categoria ativa antes de criar novos produtos.
        </div>
      )}

      <MobileSectionCard
        title="Produtos cadastrados"
        description="Lista em cards verticais para caber em qualquer celular."
        action={
          <Button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-2 text-xs"
          >
            Atualizar
          </Button>
        }
      >
        {message && (
          <p className="mb-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">
            {message}
          </p>
        )}

        <ProductList
          products={products}
          categories={categories}
          onUpdated={handleProductUpdated}
        />
      </MobileSectionCard>
    </ManagerMobileShell>
  );
}
