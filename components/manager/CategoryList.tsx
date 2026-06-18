"use client";

import { Category } from "@/types/category";

type CategoryListProps = {
  categories: Category[];
};

export function CategoryList({ categories }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-zinc-400">Nenhuma categoria cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <article
          key={category.id}
          className="w-full rounded-3xl border border-white/10 bg-zinc-900/70 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-black leading-tight text-white">
                {category.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
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
        </article>
      ))}
    </div>
  );
}
