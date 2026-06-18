"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CreateProductForm } from "@/components/manager/CreateProductForm";
import { ProductList } from "@/components/manager/ProductList";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
  }

  function handleProductUpdated(product: Product) {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id ? product : currentProduct,
      ),
    );
  }

  async function handleLogout() {
    await signOut();
    window.location.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Carregando produtos...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 px-3 py-4 pb-24 text-white sm:p-8">
      <section className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/manager" className="text-xs font-medium text-orange-400 hover:text-orange-300">
              ← Voltar ao painel
            </Link>
            <h1 className="mt-2 text-3xl font-bold">Produtos</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Cadastro, edição, foto por URL, destaque e disponibilidade.
            </p>
          </div>

          <div className="grid gap-2 sm:flex sm:items-center">
            <CreateProductForm
              categories={categories.filter((category) => category.is_active)}
              onCreated={handleProductCreated}
            />
            <Button
              type="button"
              onClick={handleLogout}
              className="w-full border border-white/10 bg-transparent text-zinc-300 hover:border-orange-500 hover:bg-transparent hover:text-white sm:w-auto"
            >
              Sair
            </Button>
          </div>
        </div>

        <Card>
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold sm:text-xl">
                Produtos cadastrados
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Lista compacta para uso diário no celular.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => loadProducts().catch(() => null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 sm:w-auto"
            >
              Atualizar
            </Button>
          </div>

          <ProductList
            products={products}
            categories={categories}
            onUpdated={handleProductUpdated}
          />
        </Card>
      </section>
    </main>
  );
}
