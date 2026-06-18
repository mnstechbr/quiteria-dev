"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryList } from "@/components/manager/CategoryList";
import { CreateCategoryForm } from "@/components/manager/CreateCategoryForm";
import {
  ManagerMobileShell,
  MobileMetricCard,
  MobileSectionCard,
} from "@/components/manager/ManagerMobileShell";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth/auth-service";
import { getCurrentSession } from "@/lib/auth/session-service";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";

export default function ManagerCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((category) => category.is_active).length,
    [categories],
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
        await loadCategories();
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

  function handleCategoryCreated(category: Category) {
    setCategories((currentCategories) => [...currentCategories, category]);
    setMessage("Categoria criada com sucesso.");
  }

  async function handleRefresh() {
    try {
      setMessage(null);
      await loadCategories();
      setMessage("Categorias atualizadas.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao atualizar categorias.",
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
        Carregando categorias...
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <ManagerMobileShell
      title="Categorias"
      description="Organize o cardápio em grupos simples para o cliente navegar pelo celular."
      activeHref="/manager/categories"
      action={<CreateCategoryForm onCreated={handleCategoryCreated} />}
      onLogout={handleLogout}
    >
      <div className="grid grid-cols-2 gap-3">
        <MobileMetricCard label="Total" value={categories.length} />
        <MobileMetricCard label="Ativas" value={activeCategories} />
      </div>

      <MobileSectionCard
        title="Categorias cadastradas"
        description="Lista vertical, sem grade desktop e sem corte lateral."
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

        <CategoryList categories={categories} />
      </MobileSectionCard>
    </ManagerMobileShell>
  );
}
