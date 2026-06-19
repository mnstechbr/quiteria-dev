"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types/category";

type CategoryListProps = {
  categories: Category[];
  onDeleted?: (categoryId: string) => void;
};

export function CategoryList({ categories, onDeleted }: CategoryListProps) {
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error("Sessão não encontrada.");
    }

    return session.access_token;
  }

  async function handleDeleteCategory(category: Category) {
    const confirmed = window.confirm(
      `Excluir ${category.name}? Se a categoria tiver produtos vinculados, ela e esses produtos serão removidos do cardápio sem apagar o histórico de pedidos.`,
    );

    if (!confirmed) return;

    try {
      setDeletingCategoryId(category.id);
      setMessage(null);

      const accessToken = await getAccessToken();

      const response = await fetch("/api/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ id: category.id }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message ?? "Erro ao excluir categoria.");
      }

      setLocalCategories((currentCategories) =>
        currentCategories.filter(
          (currentCategory) => currentCategory.id !== category.id,
        ),
      );

      onDeleted?.(category.id);
      setMessage(data.message ?? "Categoria excluída com sucesso.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Erro ao excluir categoria.",
      );
    } finally {
      setDeletingCategoryId(null);
    }
  }

  if (localCategories.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-[color:var(--q-border)] bg-[rgba(13,21,18,0.74)] p-6 text-center">
        <p className="text-sm text-[var(--q-muted)]">Nenhuma categoria cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-2xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.74)] p-3 text-sm leading-relaxed text-[var(--q-text-soft)]">
          {message}
        </p>
      )}

      {localCategories.map((category) => (
        <article
          key={category.id}
          className="w-full rounded-3xl border border-[color:var(--q-border)] bg-[rgba(17,28,24,0.72)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-black leading-tight text-white">
                {category.name}
              </p>
              <p className="mt-1 text-xs text-[var(--q-dim)]">
                Ordem: {category.sort_order ?? "-"}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${
                category.is_active
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-red-400/30 bg-red-400/10 text-red-300"
              }`}
            >
              {category.is_active ? "Ativa" : "Inativa"}
            </span>
          </div>

          <div className="mt-4">
            <button
              type="button"
              disabled={deletingCategoryId === category.id}
              onClick={() => handleDeleteCategory(category)}
              className="min-h-12 w-full rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-black text-red-200 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingCategoryId === category.id ? "Excluindo..." : "Excluir categoria"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
